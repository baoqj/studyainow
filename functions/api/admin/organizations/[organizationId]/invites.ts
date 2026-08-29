import { sha256Base64Url } from '../../../../_lib/crypto';
import { ApiError, clampInt, errorResponse, json, readJson, routeParam } from '../../../../_lib/http';
import { inviteCode, inviteCodeHint, requireOrganizationPermission, requestIpHash } from '../../../../_lib/organizations';
import { sqlTimestampAfter } from '../../../../_lib/time';

type InviteBody = { validDays?: unknown; maxUses?: unknown; replaceInviteId?: unknown };

export const onRequestGet: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const invites = await env.DB.prepare(
      `SELECT organization_invites.id, organization_invites.code_hint,
              CASE
                WHEN organization_invites.status = 'revoked' THEN 'revoked'
                WHEN organization_invites.expires_at <= CURRENT_TIMESTAMP THEN 'expired'
                WHEN organization_invites.max_uses IS NOT NULL AND organization_invites.used_count >= organization_invites.max_uses THEN 'exhausted'
                ELSE 'active'
              END AS resolved_status,
              organization_invites.expires_at, organization_invites.max_uses, organization_invites.used_count,
              organization_invites.created_at, organization_invites.revoked_at, organization_invites.last_used_at,
              creators.display_name AS created_by_name, revokers.display_name AS revoked_by_name
       FROM organization_invites
       JOIN users creators ON creators.id = organization_invites.created_by
       LEFT JOIN users revokers ON revokers.id = organization_invites.revoked_by
       WHERE organization_invites.organization_id = ? ORDER BY organization_invites.created_at DESC`,
    ).bind(organizationId).all();
    return json({ invites: invites.results, organizationId, organizationName: actor.organizationName });
  } catch (error) { return errorResponse(error); }
};

export const onRequestPost: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const organization = await env.DB.prepare('SELECT id, status FROM organizations WHERE id = ?').bind(organizationId).first<{ id: string; status: string }>();
    if (!organization) throw new ApiError(404, 'Organization not found');
    if (organization.status !== 'active') throw new ApiError(409, 'Inactive organizations cannot create invitations');
    const body = await readJson<InviteBody>(request);
    const validDays = clampInt(body.validDays, 1, 365, 30);
    const maxUses = body.maxUses === null || body.maxUses === '' || body.maxUses === undefined
      ? null
      : clampInt(body.maxUses, 1, 100_000, 1);
    const replaceInviteId = typeof body.replaceInviteId === 'string' && body.replaceInviteId.trim() ? body.replaceInviteId.trim() : null;
    if (replaceInviteId) {
      const existing = await env.DB.prepare('SELECT id FROM organization_invites WHERE id = ? AND organization_id = ?').bind(replaceInviteId, organizationId).first();
      if (!existing) throw new ApiError(404, 'Invitation to replace was not found');
    }
    const code = inviteCode();
    const inviteId = crypto.randomUUID();
    const expiresAt = sqlTimestampAfter(validDays * 24 * 60 * 60 * 1_000);
    const hash = await sha256Base64Url(code.toUpperCase());
    const requestId = request.headers.get('x-request-id')?.slice(0, 120) || crypto.randomUUID();
    const ipHash = await requestIpHash(request);
    const statements: D1PreparedStatement[] = [];
    if (replaceInviteId) {
      statements.push(
        env.DB.prepare(
          `UPDATE organization_invites SET status = 'revoked', revoked_by = ?, revoked_at = CURRENT_TIMESTAMP
           WHERE id = ? AND organization_id = ? AND status = 'active'`,
        ).bind(actor.user.id, replaceInviteId, organizationId),
        env.DB.prepare(
          `INSERT INTO organization_invites (id, organization_id, token_hash, code_hint, expires_at, max_uses, created_by)
           SELECT ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1`,
        ).bind(inviteId, organizationId, hash, inviteCodeHint(code), expiresAt, maxUses, actor.user.id),
      );
    } else {
      statements.push(
        env.DB.prepare(
          `INSERT INTO organization_invites (id, organization_id, token_hash, code_hint, expires_at, max_uses, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(inviteId, organizationId, hash, inviteCodeHint(code), expiresAt, maxUses, actor.user.id),
      );
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, after_json, request_id, ip_hash)
         SELECT ?, ?, ?, ?, 'invite', id, ?, ?, ? FROM organization_invites WHERE id = ? AND organization_id = ?`,
      ).bind(crypto.randomUUID(), organizationId, actor.user.id, replaceInviteId ? 'invite.refreshed' : 'invite.created', JSON.stringify({ validDays, maxUses, replacedInviteId: replaceInviteId }), requestId, ipHash, inviteId, organizationId),
    );
    const results = await env.DB.batch(statements);
    if (replaceInviteId && !Number(results[0]?.meta.changes ?? 0)) throw new ApiError(409, 'Invitation is already inactive');
    const origin = env.APP_ORIGIN || new URL(request.url).origin;
    return json({ invitation: { id: inviteId, code, link: `${origin}/register?invite=${encodeURIComponent(code)}`, expiresAt, maxUses } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
};
