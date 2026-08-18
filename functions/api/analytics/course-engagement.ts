import { getAuthUser } from '../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../_lib/http';

interface EventBody {
  courseType?: unknown;
  courseId?: unknown;
  chapterNumber?: unknown;
  pagePath?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<EventBody>(request);
    const courseType = body.courseType === 'creator' ? 'creator' : 'system';
    const courseKey = requireString(body.courseId, 'courseId').slice(0, 180);
    const pagePath = typeof body.pagePath === 'string' ? body.pagePath.trim().slice(0, 300) : '';
    const chapterNumber = typeof body.chapterNumber === 'number' && Number.isInteger(body.chapterNumber)
      ? body.chapterNumber
      : null;

    const course = courseType === 'system'
      ? await env.DB.prepare("SELECT id FROM courses WHERE (id = ? OR slug = ?) AND status = 'published'").bind(courseKey, courseKey).first<{ id: string }>()
      : await env.DB.prepare("SELECT id FROM creator_courses WHERE (id = ? OR slug = ?) AND status = 'published'").bind(courseKey, courseKey).first<{ id: string }>();
    if (!course) throw new ApiError(404, 'Course not found');

    let chapterId: string | null = null;
    if (courseType === 'system' && chapterNumber !== null) {
      const chapter = await env.DB.prepare('SELECT id FROM chapters WHERE course_id = ? AND chapter_number = ?')
        .bind(course.id, chapterNumber)
        .first<{ id: string }>();
      chapterId = chapter?.id ?? null;
    }

    const user = await getAuthUser(env.DB, request);
    await env.DB.prepare(
      `INSERT INTO course_engagement_events
       (id, user_id, course_type, course_id, chapter_id, event_type, page_path)
       VALUES (?, ?, ?, ?, ?, 'click', ?)`,
    ).bind(crypto.randomUUID(), user?.id ?? null, courseType, course.id, chapterId, pagePath).run();

    return json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
