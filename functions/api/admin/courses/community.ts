import { requireAdmin } from '../../../_lib/auth';
import { errorResponse, json } from '../../../_lib/http';

type CommunityCourse = { id: string } & Record<string, unknown>;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAdmin(env.DB, request);
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get('status') ?? '';
    const status = ['draft', 'published', 'expired', 'blocked', 'submitted', 'changes_requested', 'recommended', 'archived'].includes(requestedStatus)
      ? requestedStatus
      : '';
    const requestedCourseId = url.searchParams.get('courseId');
    const coursesResult = await env.DB.prepare(
      `SELECT creator_courses.id, creator_courses.slug, creator_courses.title, creator_courses.summary,
              creator_courses.language, creator_courses.status, creator_courses.review_note,
              creator_courses.points_awarded, creator_courses.created_at, creator_courses.updated_at,
              users.id AS creator_user_id, users.display_name AS creator_name, users.email AS creator_email,
              (SELECT COUNT(*) FROM course_engagement_events events
                WHERE events.course_type = 'creator' AND events.course_id = creator_courses.id AND events.event_type = 'click') AS click_count,
              0 AS learner_count
       FROM creator_courses JOIN users ON users.id = creator_courses.creator_user_id
       WHERE (? = '' OR creator_courses.status = ?)
       ORDER BY creator_courses.updated_at DESC LIMIT 200`,
    ).bind(status, status).all<CommunityCourse>();
    const courses = coursesResult.results;
    const selected = requestedCourseId
      ? courses.find((course) => course.id === requestedCourseId)
      : courses[0] ?? null;
    const trend = selected ? await env.DB.prepare(
      `WITH RECURSIVE days(day) AS (
         VALUES(date('now', '-29 days'))
         UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < date('now')
       )
       SELECT day,
              (SELECT COUNT(*) FROM course_engagement_events events
                WHERE events.course_type = 'creator' AND events.course_id = ?
                  AND events.event_type = 'click' AND date(events.created_at) = day) AS clicks,
              0 AS learners
       FROM days`,
    ).bind(selected.id).all() : null;
    return json({ courses, selected, trend: trend?.results ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
};

