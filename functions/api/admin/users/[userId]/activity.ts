import { requireAdmin } from '../../../../_lib/auth';
import { ApiError, clampInt, errorResponse, json } from '../../../../_lib/http';

const TABS = new Set(['history', 'courses', 'jobs', 'interviews', 'resumes']);

function pageParameters(request: Request) {
  const search = new URL(request.url).searchParams;
  return {
    page: clampInt(search.get('page'), 1, 10_000, 1),
    limit: clampInt(search.get('limit'), 10, 100, 50),
  };
}

async function pagedActivity(db: D1Database, userId: string, category: string | null, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const where = category ? 'user_id = ? AND category = ?' : 'user_id = ?';
  const values = category ? [userId, category] : [userId];
  const [items, count] = await Promise.all([
    db.prepare(
      `SELECT id, event_type, category, page_title, route, entity_id, occurred_at
       FROM user_activity_events WHERE ${where}
       ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`,
    ).bind(...values, limit, offset).all(),
    db.prepare(`SELECT COUNT(*) AS total FROM user_activity_events WHERE ${where}`)
      .bind(...values).first<{ total: number }>(),
  ]);
  return { items: items.results, total: Number(count?.total ?? 0), page, limit };
}

async function courseActivity(db: D1Database, userId: string) {
  const [courses, records] = await Promise.all([
    db.prepare(
      `SELECT courses.id, courses.slug, courses.title,
              COALESCE((SELECT status FROM enrollments
                WHERE enrollments.user_id = ? AND enrollments.course_id = courses.id LIMIT 1), 'active') AS enrollment_status,
              (SELECT started_at FROM enrollments
                WHERE enrollments.user_id = ? AND enrollments.course_id = courses.id LIMIT 1) AS started_at,
              (SELECT completed_at FROM enrollments
                WHERE enrollments.user_id = ? AND enrollments.course_id = courses.id LIMIT 1) AS completed_at,
              (SELECT COUNT(*) FROM chapters WHERE chapters.course_id = courses.id) AS chapter_count,
              (SELECT COUNT(*) FROM chapter_progress
                WHERE chapter_progress.user_id = ? AND chapter_progress.course_id = courses.id
                  AND chapter_progress.status = 'completed') AS completed_chapters,
              ROUND(COALESCE((SELECT SUM(chapter_progress.progress_percent) FROM chapter_progress
                WHERE chapter_progress.user_id = ? AND chapter_progress.course_id = courses.id), 0) * 1.0 /
                NULLIF((SELECT COUNT(*) FROM chapters WHERE chapters.course_id = courses.id), 0)) AS progress_percent,
              MAX(
                COALESCE((SELECT MAX(lesson_progress.last_read_at) FROM lesson_progress
                  WHERE lesson_progress.user_id = ? AND lesson_progress.course_id = courses.id), ''),
                COALESCE((SELECT MAX(chapter_progress.last_read_at) FROM chapter_progress
                  WHERE chapter_progress.user_id = ? AND chapter_progress.course_id = courses.id), ''),
                COALESCE((SELECT started_at FROM enrollments
                  WHERE enrollments.user_id = ? AND enrollments.course_id = courses.id LIMIT 1), '')
              ) AS last_read_at
       FROM courses
       WHERE EXISTS (SELECT 1 FROM enrollments WHERE enrollments.user_id = ? AND enrollments.course_id = courses.id)
          OR EXISTS (SELECT 1 FROM chapter_progress WHERE chapter_progress.user_id = ? AND chapter_progress.course_id = courses.id)
       ORDER BY last_read_at DESC, courses.title ASC
       LIMIT 100`,
    ).bind(userId, userId, userId, userId, userId, userId, userId, userId, userId, userId).all(),
    db.prepare(
      `SELECT reading_events.id, reading_events.event_type, reading_events.progress_percent,
              reading_events.created_at, courses.slug AS course_slug, courses.title AS course_title,
              chapters.chapter_number, chapters.slug AS chapter_slug, chapters.title AS chapter_title
       FROM reading_events
       JOIN courses ON courses.id = reading_events.course_id
       JOIN chapters ON chapters.id = reading_events.chapter_id
       WHERE reading_events.user_id = ?
       ORDER BY reading_events.created_at DESC, reading_events.id DESC LIMIT 100`,
    ).bind(userId).all(),
  ]);
  return {
    courses: courses.results.map((course: any) => ({
      ...course,
      chapter_count: Number(course.chapter_count),
      completed_chapters: Number(course.completed_chapters),
      progress_percent: Number(course.progress_percent ?? 0),
    })),
    records: records.results.map((record: any) => ({ ...record, progress_percent: Number(record.progress_percent) })),
  };
}

async function resumeActivity(db: D1Database, userId: string) {
  const [uploads, resumes] = await Promise.all([
    db.prepare(
      `SELECT resume_source_documents.id, resume_source_documents.filename, resume_source_documents.mime_type,
              resume_source_documents.size_bytes, resume_source_documents.parse_status,
              resume_source_documents.extraction_provider, resume_source_documents.extraction_note,
              resume_source_documents.created_at, resume_source_documents.resume_id,
              resume_documents.name AS resume_name
       FROM resume_source_documents
       LEFT JOIN resume_documents ON resume_documents.id = resume_source_documents.resume_id
       WHERE resume_source_documents.user_id = ? AND resume_source_documents.source_type = 'upload'
       ORDER BY resume_source_documents.created_at DESC LIMIT 100`,
    ).bind(userId).all(),
    db.prepare(
      `SELECT resume_documents.id, resume_documents.name, resume_documents.status,
              resume_documents.created_at, resume_documents.updated_at,
              (SELECT COUNT(*) FROM resume_versions
                WHERE resume_versions.user_id = ? AND resume_versions.resume_id = resume_documents.id) AS version_count,
              (SELECT COUNT(*) FROM resume_exports
                JOIN resume_versions ON resume_versions.id = resume_exports.resume_version_id
                WHERE resume_exports.user_id = ? AND resume_versions.resume_id = resume_documents.id) AS export_count,
              (SELECT MAX(created_at) FROM resume_versions
                WHERE resume_versions.user_id = ? AND resume_versions.resume_id = resume_documents.id) AS last_generated_at
       FROM resume_documents WHERE resume_documents.user_id = ?
       ORDER BY resume_documents.updated_at DESC, resume_documents.created_at DESC LIMIT 100`,
    ).bind(userId, userId, userId, userId).all(),
  ]);
  return {
    uploads: uploads.results.map((upload: any) => ({ ...upload, size_bytes: Number(upload.size_bytes) })),
    resumes: resumes.results.map((resume: any) => ({
      ...resume,
      version_count: Number(resume.version_count),
      export_count: Number(resume.export_count),
    })),
  };
}

export const onRequestGet: PagesFunction<Env, 'userId'> = async ({ request, env, params }) => {
  try {
    await requireAdmin(env.DB, request);
    const userId = typeof params.userId === 'string' ? params.userId : null;
    if (!userId) throw new ApiError(404, 'User not found');
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
    if (!user) throw new ApiError(404, 'User not found');

    const tab = new URL(request.url).searchParams.get('tab') ?? 'history';
    if (!TABS.has(tab)) throw new ApiError(400, 'Unknown user activity tab');
    const { page, limit } = pageParameters(request);

    if (tab === 'courses') return json({ tab, ...(await courseActivity(env.DB, userId)) });
    if (tab === 'resumes') return json({ tab, ...(await resumeActivity(env.DB, userId)) });
    const category = tab === 'jobs' ? 'job' : tab === 'interviews' ? 'interview' : null;
    return json({ tab, ...(await pagedActivity(env.DB, userId, category, page, limit)) });
  } catch (error) {
    return errorResponse(error);
  }
};
