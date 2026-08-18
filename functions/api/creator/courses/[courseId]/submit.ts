import { requireUser } from '../../../../_lib/auth';
import { createNotification } from '../../../../_lib/userRewards';
import { ApiError, errorResponse, json } from '../../../../_lib/http';

export const onRequestPost: PagesFunction<Env, 'courseId'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const courseId = params.courseId;
    if (!courseId) throw new ApiError(404, 'Course not found');
    const course = await env.DB
      .prepare('SELECT id, title, body_markdown, status FROM creator_courses WHERE id = ? AND creator_user_id = ?')
      .bind(courseId, user.id)
      .first<{ id: string; title: string; body_markdown: string; status: string }>();
    if (!course) throw new ApiError(404, 'Course not found');
    if (!['draft', 'changes_requested'].includes(course.status)) throw new ApiError(409, 'Course is already under review');
    if (course.body_markdown.trim().length < 300) throw new ApiError(400, 'Add at least 300 characters of original course content before submission');
    await env.DB.prepare(`UPDATE creator_courses SET status = 'submitted', review_note = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(course.id).run();
    await createNotification(env.DB, { userId: user.id, kind: 'creator_review', title: 'Course submitted for review', body: `${course.title} is now in the quality review queue.`, actionUrl: '/me/creator' });
    return json({ ok: true, status: 'submitted' });
  } catch (error) {
    return errorResponse(error);
  }
};
