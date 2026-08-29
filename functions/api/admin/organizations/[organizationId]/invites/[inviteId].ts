import { ApiError, errorResponse, json, readJson, routeParam } from '../../../../../_lib/http';
import { requireOrganizationPermission, requestIpHash } from '../../../../../_lib/organizations';

export const onRequestPatch: PagesFunction<Env, 'organizationId' | 'inviteId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    const inviteId = routeParam(params.inviteId);
    if (!organizationId || !inviteId) throw new ApiError(404, 'Invitation not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const body = await readJson<Record<string, unknown>>(request);
    if (body.action !== 'revoke') throw new ApiError(400, 'action must be revoke');
    const requestId = request.headers.get('x-request-id')?.slice(0, 120) || crypto.randomUUID();
    const ipHash = await requestIpHash(request);
    const results = await env.DB.batch([
      env.DB.prepare(
        `UPDATE organization_invites SET status = 'revoked', revoked_by = ?, revoked_at = CURRENT_TIMESTAMP
         WHERE id = ? AND organization_id = ? AND status = 'active'`,
      ).bind(actor.user.id, inviteId, organizationId),
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, after_json, request_id, ip_hash)
         SELECT ?, ?, ?, 'invite.revoked', 'invite', id, ?, ?, ? FROM organization_invites
         WHERE changes() = 1 AND id = ? AND organization_id = ? AND status = 'revoked'`,
      ).bind(crypto.randomUUID(), organizationId, actor.user.id, JSON.stringify({ status: 'revoked' }), requestId, ipHash, inviteId, organizationId),
    ]);
    if (!Number(results[0]?.meta.changes ?? 0)) throw new ApiError(409, 'Invitation is already inactive');
    return json({ ok: true });
  } catch (error) { return errorResponse(error); }
};
