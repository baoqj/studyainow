import { requireAdmin } from '../../_lib/auth';
import { errorResponse, json } from '../../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAdmin(env.DB, request);
    const [summary, trend, recent] = await Promise.all([
      env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM users) AS users,
          (SELECT COUNT(*) FROM courses) AS system_courses,
          (SELECT COUNT(*) FROM creator_courses) AS creator_courses,
          (SELECT COUNT(*) FROM skills WHERE status = 'approved') AS skills,
          (SELECT COUNT(*) FROM job_sources WHERE enabled = 1) AS active_sources,
          (SELECT COUNT(*) FROM job_postings WHERE status = 'published') AS published_jobs,
          (SELECT COUNT(*) FROM course_engagement_events WHERE event_type = 'click') AS course_clicks,
          (SELECT COUNT(DISTINCT user_id) FROM lesson_progress) AS learners`,
      ).first(),
      env.DB.prepare(
        `WITH RECURSIVE days(day) AS (
           VALUES(date('now', '-13 days'))
           UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < date('now')
         )
         SELECT day,
                (SELECT COUNT(*) FROM course_engagement_events events
                  WHERE events.event_type = 'click' AND date(events.created_at) = day) AS clicks,
                (SELECT COUNT(DISTINCT reading_events.user_id) FROM reading_events
                  WHERE date(reading_events.created_at) = day) AS learners
         FROM days`,
      ).all(),
      env.DB.prepare(
        `SELECT action, entity_type, entity_id, metadata_json, created_at
         FROM admin_audit_logs ORDER BY created_at DESC LIMIT 12`,
      ).all(),
    ]);
    return json({ summary, trend: trend.results, recent: recent.results });
  } catch (error) {
    return errorResponse(error);
  }
};
