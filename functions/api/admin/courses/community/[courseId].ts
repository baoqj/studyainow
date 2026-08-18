import { requireAdmin } from '../../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../../_lib/http';

interface StatusBody {
  status?: unknown;
  note?: unknown;
  expectedUpdatedAt?: unknown;
}

export const onRequestPatch: PagesFunction<Env, 'courseId'> = async ({ request, env, params }) => {
  try {
    const admin = await requireAdmin(env.DB, request);
    const courseId = typeof params.courseId === 'string' ? params.courseId : null;
    if (!courseId) throw new ApiError(404, 'Course not found');
    const body = await readJson<StatusBody>(request);
    const status = typeof body.status === 'string' ? body.status : '';
    if (!['published', 'draft', 'expired', 'blocked'].includes(status)) {
      throw new ApiError(400, 'status must be published, draft, expired, or blocked');
    }
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1_000) : '';
    const expectedUpdatedAt = requireString(body.expectedUpdatedAt, 'expectedUpdatedAt');
    const current = await env.DB.prepare('SELECT id, updated_at FROM creator_courses WHERE id = ?').bind(courseId).first<{ id: string; updated_at: string }>();
    if (!current) throw new ApiError(404, 'Course not found');
    if (current.updated_at !== expectedUpdatedAt) throw new ApiError(409, 'This course was updated by someone else. Reload and try again.');

    const results = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO admin_audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json)
         SELECT ?, ?, 'creator_course.status_changed', 'creator_course', id, ?
         FROM creator_courses WHERE id = ? AND updated_at = ?`,
      ).bind(crypto.randomUUID(), admin.id, JSON.stringify({ status, note: note || null }), courseId, expectedUpdatedAt),
      env.DB.prepare(
        `UPDATE creator_courses SET status = ?, review_note = ?, reviewer_user_id = ?,
             updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
         WHERE id = ? AND updated_at = ?`,
      ).bind(status, note || null, admin.id, courseId, expectedUpdatedAt),
    ]);
    if (!Number(results[1]?.meta.changes ?? 0)) throw new ApiError(409, 'This course was updated by someone else. Reload and try again.');
    return json({ ok: true, status });
  } catch (error) {
    return errorResponse(error);
  }
};
