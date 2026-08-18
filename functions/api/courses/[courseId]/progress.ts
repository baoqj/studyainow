import { requireUser } from '../../../_lib/auth';
import { errorResponse, json } from '../../../_lib/http';

export const onRequestGet: PagesFunction<Env, 'courseId'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const courseId = String(params.courseId);

    const course = await env.DB
      .prepare('SELECT id, slug, title FROM courses WHERE slug = ? OR id = ?')
      .bind(courseId, courseId)
      .first<{ id: string; slug: string; title: string }>();

    if (!course) {
      return json({ error: 'Course not found' }, { status: 404 });
    }

    const progress = await env.DB
      .prepare(
        `SELECT chapters.chapter_number, chapters.slug, chapters.title,
                chapter_progress.status, chapter_progress.progress_percent,
                chapter_progress.scroll_y, chapter_progress.last_read_at,
                chapter_progress.completed_at
         FROM chapters
         LEFT JOIN chapter_progress
           ON chapter_progress.chapter_id = chapters.id
          AND chapter_progress.user_id = ?
         WHERE chapters.course_id = ?
         ORDER BY chapters.order_index ASC`,
      )
      .bind(user.id, course.id)
      .all();

    return json({ course, progress: progress.results });
  } catch (error) {
    return errorResponse(error);
  }
};
