import { requireUser } from '../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../_lib/http';

interface CreatorCourseBody { title?: unknown; summary?: unknown; language?: unknown; bodyMarkdown?: unknown; }

export const onRequestPut: PagesFunction<Env, 'courseId'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const courseId = params.courseId;
    if (!courseId) throw new ApiError(404, 'Course not found');
    const body = await readJson<CreatorCourseBody>(request);
    const title = requireString(body.title, 'title');
    const summary = requireString(body.summary, 'summary');
    const language = typeof body.language === 'string' ? body.language : 'zh-CN';
    const bodyMarkdown = typeof body.bodyMarkdown === 'string' ? body.bodyMarkdown.trim() : '';
    if (title.length > 140 || summary.length > 600 || bodyMarkdown.length > 100_000) throw new ApiError(400, 'Course content is too long');
    if (!['zh-CN', 'zh-TW', 'en', 'fr', 'es'].includes(language)) throw new ApiError(400, 'Unsupported course language');

    const result = await env.DB
      .prepare(
        `UPDATE creator_courses SET title = ?, summary = ?, language = ?, body_markdown = ?,
         status = CASE WHEN status = 'changes_requested' THEN 'draft' ELSE status END,
         updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_user_id = ? AND status IN ('draft', 'changes_requested')`,
      )
      .bind(title, summary, language, bodyMarkdown, courseId, user.id)
      .run();
    if (!Number(result.meta.changes ?? 0)) throw new ApiError(409, 'Only a draft or changes-requested course can be edited');
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
