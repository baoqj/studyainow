import { requireUser } from '../_lib/auth';
import { clampInt, errorResponse, json, readJson, requireString } from '../_lib/http';
import { awardBadge, createNotification } from '../_lib/userRewards';

interface ProgressBody {
  course_id?: unknown;
  chapter_number?: unknown;
  chapter_lesson_count?: unknown;
  lesson_route_id?: unknown;
  lesson_number?: unknown;
  progress_percent?: unknown;
  scroll_y?: unknown;
  status?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const body = await readJson<ProgressBody>(request);
    const courseSlug = requireString(body.course_id, 'course_id');
    const chapterNumber = clampInt(body.chapter_number, 0, 999, 0);
    const chapterLessonCount = clampInt(body.chapter_lesson_count, 0, 1_000, 0);
    const lessonRouteId = typeof body.lesson_route_id === 'string' && body.lesson_route_id.trim()
      ? body.lesson_route_id.trim().slice(0, 240)
      : null;
    const lessonNumber = clampInt(body.lesson_number, 0, 9_999, 0);
    const progressPercent = clampInt(body.progress_percent, 0, 100, 0);
    const scrollY = clampInt(body.scroll_y, 0, 10_000_000, 0);
    // Completion is deliberately explicit: scrolling near the end is not
    // enough. A learner must mark the lesson complete or choose Next.
    const status = body.status === 'completed' ? 'completed' : 'reading';

    const row = await env.DB
      .prepare(
        `SELECT courses.id AS course_id, chapters.id AS chapter_id
         FROM courses
         JOIN chapters ON chapters.course_id = courses.id
         WHERE (courses.slug = ? OR courses.id = ?)
           AND chapters.chapter_number = ?`,
      )
      .bind(courseSlug, courseSlug, chapterNumber)
      .first<{ course_id: string; chapter_id: string }>();

    if (!row) {
      return json({ error: 'Course chapter not found' }, { status: 404 });
    }

    const statements: D1PreparedStatement[] = [
      env.DB
        .prepare(
          `INSERT OR IGNORE INTO enrollments (id, user_id, course_id, access_type, status)
           VALUES (?, ?, ?, 'free', 'active')`,
        )
        .bind(crypto.randomUUID(), user.id, row.course_id),
      env.DB
        .prepare(
          `INSERT INTO chapter_progress (user_id, course_id, chapter_id, status, progress_percent, scroll_y, last_read_at, completed_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, course_id, chapter_id) DO UPDATE SET
             status = CASE WHEN chapter_progress.status = 'completed' THEN 'completed' ELSE excluded.status END,
             progress_percent = MAX(chapter_progress.progress_percent, excluded.progress_percent),
             scroll_y = excluded.scroll_y,
             last_read_at = CURRENT_TIMESTAMP,
             completed_at = CASE
               WHEN excluded.status = 'completed' AND chapter_progress.completed_at IS NULL THEN CURRENT_TIMESTAMP
               ELSE chapter_progress.completed_at
             END,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(user.id, row.course_id, row.chapter_id, status, progressPercent, scrollY, status),
      env.DB
        .prepare(
          `INSERT INTO reading_events (id, user_id, course_id, chapter_id, event_type, progress_percent)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), user.id, row.course_id, row.chapter_id, status === 'completed' ? 'complete' : 'progress', progressPercent),
    ];

    if (lessonRouteId) {
      statements.push(
        env.DB
          .prepare(
            `INSERT INTO lesson_progress (
               user_id, course_id, chapter_id, lesson_route_id, lesson_number,
               status, progress_percent, scroll_y, last_read_at, completed_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
               CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, course_id, lesson_route_id) DO UPDATE SET
               chapter_id = excluded.chapter_id,
               lesson_number = excluded.lesson_number,
               status = CASE WHEN lesson_progress.status = 'completed' THEN 'completed' ELSE excluded.status END,
               progress_percent = MAX(lesson_progress.progress_percent, excluded.progress_percent),
               scroll_y = excluded.scroll_y,
               last_read_at = CURRENT_TIMESTAMP,
               completed_at = CASE
                 WHEN (lesson_progress.status = 'completed' OR excluded.status = 'completed')
                   AND lesson_progress.completed_at IS NULL THEN CURRENT_TIMESTAMP
                 ELSE lesson_progress.completed_at
               END,
               updated_at = CURRENT_TIMESTAMP`,
          )
          .bind(user.id, row.course_id, row.chapter_id, lessonRouteId, lessonNumber, status, progressPercent, scrollY, status),
      );
    }

    await env.DB.batch(statements);

    if (lessonRouteId && chapterLessonCount > 0) {
      const completedLessons = await env.DB
        .prepare(
          `SELECT COUNT(*) AS total FROM lesson_progress
           WHERE user_id = ? AND course_id = ? AND chapter_id = ? AND status = 'completed'`,
        )
        .bind(user.id, row.course_id, row.chapter_id)
        .first<{ total: number }>();
      const chapterComplete = Number(completedLessons?.total ?? 0) >= chapterLessonCount;
      if (chapterComplete) {
        await env.DB
          .prepare(
            `UPDATE chapter_progress
             SET status = 'completed', progress_percent = 100,
                 completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND course_id = ? AND chapter_id = ?`,
          )
          .bind(user.id, row.course_id, row.chapter_id)
          .run();
      }
    }

    if (status === 'completed') {
      const firstCompletion = await awardBadge(env.DB, { userId: user.id, slug: 'first-completion', reason: 'Completed a course lesson' });
      if (firstCompletion) {
        await createNotification(env.DB, {
          userId: user.id,
          kind: 'course_update',
          title: 'First learning milestone unlocked',
          body: 'You completed your first course lesson. Keep the learning momentum going.',
          actionUrl: '/me/course',
        });
      }
    }

    return json({ ok: true, status, progress_percent: progressPercent });
  } catch (error) {
    return errorResponse(error);
  }
};
