import { requireAdmin } from '../../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString, routeParam } from '../../../../_lib/http';
import { requestIpHash } from '../../../../_lib/organizations';

type LeaderBody = { userId?: unknown; confirm?: unknown; confirmMigration?: unknown; expectedUpdatedAt?: unknown };

export const onRequestPut: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const actor = await requireAdmin(env.DB, request);
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const body = await readJson<LeaderBody>(request);
    if (body.confirm !== true) throw new ApiError(400, 'Leader change confirmation is required');
    const expectedUpdatedAt = requireString(body.expectedUpdatedAt, 'expectedUpdatedAt');
    const organization = await env.DB.prepare(
      'SELECT id, name, status, leader_user_id, updated_at FROM organizations WHERE id = ?',
    ).bind(organizationId).first<{ id: string; name: string; status: string; leader_user_id: string | null; updated_at: string }>();
    if (!organization) throw new ApiError(404, 'Organization not found');
    if (organization.updated_at !== expectedUpdatedAt) throw new ApiError(409, 'Organization changed. Reload and try again.');
    const nextUserId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;
    if (nextUserId === organization.leader_user_id) throw new ApiError(409, 'This user is already the Leader');
    if (nextUserId && organization.status !== 'active') throw new ApiError(409, 'Activate the organization before assigning a Leader');
    const target = nextUserId ? await env.DB.prepare(
      `SELECT id, display_name, organization_id, organization_role FROM users WHERE id = ? AND status = 'active'`,
    ).bind(nextUserId).first<{ id: string; display_name: string; organization_id: string | null; organization_role: string | null }>() : null;
    if (nextUserId && !target) throw new ApiError(404, 'Leader candidate not found');
    if (target?.organization_id && target.organization_id !== organizationId && body.confirmMigration !== true) {
      throw new ApiError(409, 'confirmMigration is required to move this user from another organization');
    }
    const previousLeaderId = organization.leader_user_id;
    const requestId = request.headers.get('x-request-id')?.slice(0, 120) || crypto.randomUUID();
    const ipHash = await requestIpHash(request);
    const statements: D1PreparedStatement[] = [];
    if (target?.organization_id && target.organization_id !== organizationId && target.organization_role === 'leader') {
      statements.push(
        env.DB.prepare(
          `UPDATE organizations SET leader_user_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND leader_user_id = ?
             AND EXISTS (SELECT 1 FROM organizations target_org WHERE target_org.id = ? AND target_org.updated_at = ?)`,
        ).bind(target.organization_id, target.id, organizationId, expectedUpdatedAt),
        env.DB.prepare(
          `INSERT INTO organization_audit_logs (id, organization_id, actor_user_id, action, target_type, target_id, before_json, after_json, request_id, ip_hash)
           SELECT ?, ?, ?, 'leader.revoked_for_migration', 'user', ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM organizations WHERE id = ? AND updated_at = ?)`,
        ).bind(crypto.randomUUID(), target.organization_id, actor.id, target.id, JSON.stringify({ role: 'leader' }), JSON.stringify({ role: 'member', migratedTo: organizationId }), requestId, ipHash, organizationId, expectedUpdatedAt),
      );
    }
    if (previousLeaderId) {
      statements.push(
        env.DB.prepare(
          `UPDATE users SET organization_role = 'member', updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND organization_id = ?
             AND EXISTS (SELECT 1 FROM organizations WHERE id = ? AND updated_at = ?)`,
        ).bind(previousLeaderId, organizationId, organizationId, expectedUpdatedAt),
        env.DB.prepare(
          `DELETE FROM user_roles WHERE user_id = ? AND role = 'leader'
             AND EXISTS (SELECT 1 FROM organizations WHERE id = ? AND updated_at = ?)`,
        ).bind(previousLeaderId, organizationId, expectedUpdatedAt),
      );
    }
    if (target) {
      statements.push(
        env.DB.prepare(
          `UPDATE users SET organization_id = ?, organization_role = 'leader',
                  organization_joined_at = CASE WHEN organization_id = ? THEN organization_joined_at ELSE CURRENT_TIMESTAMP END,
                  updated_at = CURRENT_TIMESTAMP WHERE id = ?
             AND EXISTS (SELECT 1 FROM organizations WHERE id = ? AND updated_at = ?)`,
        ).bind(organizationId, organizationId, target.id, organizationId, expectedUpdatedAt),
        env.DB.prepare(
          `INSERT OR IGNORE INTO user_roles (user_id, role)
           SELECT ?, 'leader' WHERE EXISTS (SELECT 1 FROM organizations WHERE id = ? AND updated_at = ?)`,
        ).bind(target.id, organizationId, expectedUpdatedAt),
      );
    }
    statements.push(
      env.DB.prepare(
        `UPDATE organizations SET leader_user_id = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
         WHERE id = ? AND updated_at = ?`,
      ).bind(nextUserId, organizationId, expectedUpdatedAt),
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, before_json, after_json, request_id, ip_hash)
         SELECT ?, id, ?, ?, 'user', ?, ?, ?, ?, ? FROM organizations WHERE id = ? AND leader_user_id IS ?`,
      ).bind(
        crypto.randomUUID(), actor.id, nextUserId ? 'leader.assigned' : 'leader.revoked', nextUserId ?? previousLeaderId,
        JSON.stringify({ leaderUserId: previousLeaderId }), JSON.stringify({ leaderUserId: nextUserId }), requestId, ipHash,
        organizationId, nextUserId,
      ),
    );
    const results = await env.DB.batch(statements);
    const organizationUpdate = results[statements.length - 2];
    if (!Number(organizationUpdate?.meta.changes ?? 0)) throw new ApiError(409, 'Organization changed. Reload and try again.');
    return json({ ok: true, leaderUserId: nextUserId });
  } catch (error) { return errorResponse(error); }
};
