import { requireAdmin } from '../../../_lib/auth';
import { ApiError, errorResponse, json } from '../../../_lib/http';

type CourseRow = { id: string; slug: string; title: string } & Record<string, unknown>;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAdmin(env.DB, request);
    const requestedCourseId = new URL(request.url).searchParams.get('courseId');
    const courseResult = await env.DB.prepare(
      `SELECT courses.id, courses.slug, courses.title, courses.subtitle, courses.topic, courses.level,
              courses.status, courses.visibility, courses.creator_name, courses.created_at, courses.updated_at,
              COUNT(DISTINCT chapters.id) AS chapter_count,
              (SELECT COUNT(*) FROM course_engagement_events events
                WHERE events.course_type = 'system' AND events.course_id = courses.id AND events.event_type = 'click') AS click_count,
              (SELECT COUNT(DISTINCT chapter_progress.user_id) FROM chapter_progress
                WHERE chapter_progress.course_id = courses.id) AS learner_count,
              (SELECT COUNT(*) FROM lesson_progress
                WHERE lesson_progress.course_id = courses.id AND lesson_progress.status = 'completed') AS completed_lessons
       FROM courses LEFT JOIN chapters ON chapters.course_id = courses.id
       GROUP BY courses.id ORDER BY courses.updated_at DESC`,
    ).all<CourseRow>();
    const courses = courseResult.results;
    const selected = requestedCourseId
      ? courses.find((course) => course.id === requestedCourseId || course.slug === requestedCourseId)
      : courses[0];
    if (requestedCourseId && !selected) throw new ApiError(404, 'Course not found');
    if (!selected) return json({ courses: [], selected: null, chapters: [], trend: [] });

    const [chapters, trend] = await Promise.all([
      env.DB.prepare(
        `SELECT chapters.id, chapters.chapter_number, chapters.slug, chapters.title, chapters.duration_minutes,
                (SELECT COUNT(*) FROM course_engagement_events events
                  WHERE events.course_type = 'system' AND events.chapter_id = chapters.id AND events.event_type = 'click') AS click_count,
                (SELECT COUNT(DISTINCT chapter_progress.user_id) FROM chapter_progress
                  WHERE chapter_progress.chapter_id = chapters.id) AS learner_count,
                (SELECT COUNT(*) FROM chapter_progress
                  WHERE chapter_progress.chapter_id = chapters.id AND chapter_progress.status = 'completed') AS completion_count,
                (SELECT COUNT(*) FROM reading_events
                  WHERE reading_events.chapter_id = chapters.id) AS learning_events
         FROM chapters WHERE chapters.course_id = ? ORDER BY chapters.order_index`,
      ).bind(selected.id).all(),
      env.DB.prepare(
        `WITH RECURSIVE days(day) AS (
           VALUES(date('now', '-29 days'))
           UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < date('now')
         )
         SELECT day,
                (SELECT COUNT(*) FROM course_engagement_events events
                  WHERE events.course_type = 'system' AND events.course_id = ?
                    AND events.event_type = 'click' AND date(events.created_at) = day) AS clicks,
                (SELECT COUNT(DISTINCT reading_events.user_id) FROM reading_events
                  WHERE reading_events.course_id = ? AND date(reading_events.created_at) = day) AS learners
         FROM days`,
      ).bind(selected.id, selected.id).all(),
    ]);

    return json({ courses, selected, chapters: chapters.results, trend: trend.results });
  } catch (error) {
    return errorResponse(error);
  }
};

