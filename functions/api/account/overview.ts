import { requireUser } from '../../_lib/auth';
import { errorResponse, json } from '../../_lib/http';

type CourseProgressRow = {
  course_id: string;
  course_slug: string;
  course_title: string;
  completed_chapters: number;
  chapter_count: number;
  average_progress: number;
  last_read_at: string | null;
};

type LessonProgressRow = {
  course_id: string;
  chapter_number: number;
  chapter_slug: string;
  lesson_route_id: string;
  lesson_number: number;
  status: 'reading' | 'completed';
  progress_percent: number;
  scroll_y: number;
  last_read_at: string;
  completed_at: string | null;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const [profile, points, badges, courses, lessonProgress, history, notifications, creatorStats, resumeStats] = await Promise.all([
      env.DB.prepare('SELECT id, email, display_name, username, avatar_url, email_verified_at FROM users WHERE id = ?').bind(user.id).first(),
      env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM point_transactions WHERE user_id = ?').bind(user.id).first<{ balance: number }>(),
      env.DB.prepare(
        `SELECT badges.slug, badges.name, badges.description, badges.icon, user_badges.awarded_at
         FROM user_badges JOIN badges ON badges.id = user_badges.badge_id
         WHERE user_badges.user_id = ? ORDER BY user_badges.awarded_at DESC`,
      ).bind(user.id).all(),
      env.DB.prepare(
        `SELECT courses.id AS course_id, courses.slug AS course_slug, courses.title AS course_title,
                (SELECT COUNT(*) FROM chapter_progress
                  WHERE chapter_progress.user_id = enrollments.user_id
                    AND chapter_progress.course_id = courses.id AND chapter_progress.status = 'completed') AS completed_chapters,
                (SELECT COUNT(*) FROM chapters WHERE chapters.course_id = courses.id) AS chapter_count,
                (SELECT ROUND(COALESCE(AVG(chapter_progress.progress_percent), 0)) FROM chapter_progress
                  WHERE chapter_progress.user_id = enrollments.user_id AND chapter_progress.course_id = courses.id) AS average_progress,
                COALESCE(
                  (SELECT MAX(lesson_progress.last_read_at) FROM lesson_progress
                    WHERE lesson_progress.user_id = enrollments.user_id AND lesson_progress.course_id = courses.id),
                  (SELECT MAX(chapter_progress.last_read_at) FROM chapter_progress
                    WHERE chapter_progress.user_id = enrollments.user_id AND chapter_progress.course_id = courses.id),
                  enrollments.started_at
                ) AS last_read_at
         FROM enrollments
         JOIN courses ON courses.id = enrollments.course_id
         WHERE enrollments.user_id = ?
         GROUP BY courses.id
         ORDER BY last_read_at DESC`,
      ).bind(user.id).all<CourseProgressRow>(),
      env.DB.prepare(
        `SELECT lesson_progress.course_id, chapters.chapter_number, chapters.slug AS chapter_slug,
                lesson_progress.lesson_route_id, lesson_progress.lesson_number, lesson_progress.status,
                lesson_progress.progress_percent, lesson_progress.scroll_y, lesson_progress.last_read_at,
                lesson_progress.completed_at
         FROM lesson_progress JOIN chapters ON chapters.id = lesson_progress.chapter_id
         WHERE lesson_progress.user_id = ?
         ORDER BY lesson_progress.last_read_at DESC`,
      ).bind(user.id).all<LessonProgressRow>(),
      env.DB.prepare(
        `SELECT reading_events.event_type, reading_events.progress_percent, reading_events.created_at,
                courses.slug AS course_slug, courses.title AS course_title, chapters.chapter_number, chapters.title AS chapter_title
         FROM reading_events JOIN courses ON courses.id = reading_events.course_id
         JOIN chapters ON chapters.id = reading_events.chapter_id
         WHERE reading_events.user_id = ? ORDER BY reading_events.created_at DESC LIMIT 30`,
      ).bind(user.id).all(),
      env.DB.prepare(
        `SELECT id, kind, title, body, action_url, read_at, created_at FROM user_notifications
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      ).bind(user.id).all(),
      env.DB.prepare(
        `SELECT COUNT(*) AS total, COUNT(CASE WHEN status IN ('recommended', 'published') THEN 1 END) AS recommended
         FROM creator_courses WHERE creator_user_id = ?`,
      ).bind(user.id).first<{ total: number; recommended: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS total FROM resume_versions WHERE user_id = ?').bind(user.id).first<{ total: number }>(),
    ]);

    return json({
      profile,
      points: Number(points?.balance ?? 0),
      badges: badges.results,
      courses: courses.results.map((course) => ({
        ...course,
        completed_chapters: Number(course.completed_chapters),
        chapter_count: Number(course.chapter_count),
        average_progress: Number(course.average_progress),
        lesson_progress: lessonProgress.results
          .filter((lesson) => lesson.course_id === course.course_id)
          .map((lesson) => ({
            ...lesson,
            chapter_number: Number(lesson.chapter_number),
            lesson_number: Number(lesson.lesson_number),
            progress_percent: Number(lesson.progress_percent),
            scroll_y: Number(lesson.scroll_y),
          })),
      })),
      history: history.results,
      notifications: notifications.results,
      creator: { total: Number(creatorStats?.total ?? 0), recommended: Number(creatorStats?.recommended ?? 0) },
      resumes: { total: Number(resumeStats?.total ?? 0) },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
