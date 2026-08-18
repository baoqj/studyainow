import { requireAdmin } from '../../../_lib/auth';
import { ApiError, clampInt, errorResponse, json, readJson, requireString } from '../../../_lib/http';
import { assertDisplayPolicy } from '../../../_lib/jobs';

interface UpdateSourceBody {
  enabled?: unknown;
  pollingMinutes?: unknown;
  displayPolicy?: unknown;
  expectedUpdatedAt?: unknown;
}

export const onRequestPatch: PagesFunction<Env, 'sourceId'> = async ({ env, request, params }) => {
  try {
    const admin = await requireAdmin(env.DB, request);
    const sourceId = typeof params.sourceId === 'string' ? params.sourceId : null;
    if (!sourceId) throw new ApiError(404, 'Source not found');
    const body = await readJson<UpdateSourceBody>(request);
    const enabled = body.enabled === true || body.enabled === 1 ? 1 : body.enabled === false || body.enabled === 0 ? 0 : null;
    if (enabled === null) throw new ApiError(400, 'enabled must be a boolean');
    const pollingMinutes = clampInt(body.pollingMinutes, 15, 43_200, 1_440);
    const displayPolicy = assertDisplayPolicy(body.displayPolicy);
    const expectedUpdatedAt = requireString(body.expectedUpdatedAt, 'expectedUpdatedAt');

    const current = await env.DB.prepare('SELECT id, updated_at FROM job_sources WHERE id = ?').bind(sourceId).first<{ id: string; updated_at: string }>();
    if (!current) throw new ApiError(404, 'Source not found');
    if (current.updated_at !== expectedUpdatedAt) throw new ApiError(409, 'This source was updated by someone else. Reload and try again.');

    const results = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO admin_audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json)
         SELECT ?, ?, 'job_source.updated', 'job_source', id, ?
         FROM job_sources WHERE id = ? AND updated_at = ?`,
      ).bind(crypto.randomUUID(), admin.id, JSON.stringify({ enabled: Boolean(enabled), pollingMinutes, displayPolicy }), sourceId, expectedUpdatedAt),
      env.DB.prepare(
        `UPDATE job_sources SET enabled = ?, polling_minutes = ?, display_policy = ?,
             next_fetch_at = CASE WHEN ? = 1 THEN COALESCE(next_fetch_at, CURRENT_TIMESTAMP) ELSE next_fetch_at END,
             updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
         WHERE id = ? AND updated_at = ?`,
      ).bind(enabled, pollingMinutes, displayPolicy, enabled, sourceId, expectedUpdatedAt),
    ]);
    if (!Number(results[1]?.meta.changes ?? 0)) throw new ApiError(409, 'This source was updated by someone else. Reload and try again.');
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
