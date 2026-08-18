import { requireUser } from '../../../../_lib/auth';
import { ApiError, errorResponse, json } from '../../../../_lib/http';

function id(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${label} is required`);
  return value.trim().slice(0, 120);
}

/** Delete a user-owned source from both private R2 and D1. */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumeId = id(params.resumeId, 'resumeId');
    const sourceId = id(params.sourceId, 'sourceId');
    const source = await env.DB.prepare(
      `SELECT r2_key FROM resume_source_documents
       WHERE id = ? AND resume_id = ? AND user_id = ?`,
    ).bind(sourceId, resumeId, user.id).first<{ r2_key: string | null }>();
    if (!source) throw new ApiError(404, 'Imported source not found');
    if (source.r2_key) await env.COURSE_STORAGE.delete(source.r2_key);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM resume_source_documents WHERE id = ? AND resume_id = ? AND user_id = ?').bind(sourceId, resumeId, user.id),
      env.DB.prepare('UPDATE resume_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(resumeId, user.id),
    ]);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
