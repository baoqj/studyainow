import { sqliteLike } from '../../../../_lib/admin';
import { ApiError, clampInt, errorResponse, json, readJson, requireString, routeParam } from '../../../../_lib/http';
import { requireOrganizationPermission, requestIpHash } from '../../../../_lib/organizations';

type MemberBody = { userId?: unknown; confirmMigration?: unknown };

export const onRequestGet: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
    const mode = url.searchParams.get('mode') === 'candidates' ? 'candidates' : 'members';
    const limit = clampInt(url.searchParams.get('limit'), 10, 100, 50);
    const like = sqliteLike(query);
    if (mode === 'candidates') {
      const organizationScope = actor.isAdmin ? '(users.organization_id IS NULL OR users.organization_id <> ?)' : 'users.organization_id IS NULL';
      const administratorScope = actor.isAdmin ? '' : "AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'admin')";
      const bindings: unknown[] = actor.isAdmin ? [organizationId] : [];
      const candidates = await env.DB.prepare(
        `SELECT users.id, users.email, users.display_name, users.username, users.status,
                users.organization_id, organizations.name AS organization_name,
                EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'admin') AS is_administrator
         FROM users LEFT JOIN organizations ON organizations.id = users.organization_id
         WHERE ${organizationScope} AND users.status = 'active'
           ${administratorScope}
           AND (? = '%%' OR users.id LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\'
                OR users.display_name LIKE ? ESCAPE '\\' OR COALESCE(users.username, '') LIKE ? ESCAPE '\\')
         ORDER BY users.display_name ASC LIMIT ?`,
      ).bind(...bindings, like, like, like, like, like, limit).all();
      return json({ candidates: candidates.results, scope: actor.isAdmin ? 'administrator' : 'unassigned-only' });
    }

    const members = await env.DB.prepare(
      `SELECT users.id, users.email, users.display_name, users.username, users.status,
              users.organization_role, users.organization_joined_at, users.last_login_at,
              EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'admin') AS is_administrator
       FROM users WHERE users.organization_id = ?
         AND (? = '%%' OR users.id LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\'
              OR users.display_name LIKE ? ESCAPE '\\' OR COALESCE(users.username, '') LIKE ? ESCAPE '\\')
       ORDER BY CASE users.organization_role WHEN 'leader' THEN 0 ELSE 1 END,
                users.organization_joined_at DESC, users.display_name ASC
       LIMIT ?`,
    ).bind(organizationId, like, like, like, like, like, limit).all();
    return json({ members: members.results, organizationId, organizationName: actor.organizationName, permissions: { administrator: actor.isAdmin } });
  } catch (error) { return errorResponse(error); }
};

export const onRequestPost: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const body = await readJson<MemberBody>(request);
    const userId = requireString(body.userId, 'userId');
    const organization = await env.DB.prepare('SELECT id, name, status FROM organizations WHERE id = ?').bind(organizationId).first<{ id: string; name: string; status: string }>();
    if (!organization) throw new ApiError(404, 'Organization not found');
    if (organization.status !== 'active') throw new ApiError(409, 'Inactive organizations cannot accept members');
    const target = await env.DB.prepare(
      `SELECT users.id, users.organization_id, users.organization_role, users.display_name,
              EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'admin') AS is_administrator
       FROM users WHERE users.id = ?`,
    ).bind(userId).first<{ id: string; organization_id: string | null; organization_role: string | null; display_name: string; is_administrator: number }>();
    if (!target) throw new ApiError(404, 'User not found');
    if (!actor.isAdmin && target.is_administrator) throw new ApiError(403, 'Leader cannot manage an Administrator');
    if (target.organization_id === organizationId) throw new ApiError(409, 'User already belongs to this organization');
    if (target.organization_id && !actor.isAdmin) throw new ApiError(409, 'Only an Administrator can migrate users between organizations');
    if (target.organization_id && body.confirmMigration !== true) throw new ApiError(409, 'confirmMigration is required for cross-organization migration');

    const requestId = request.headers.get('x-request-id')?.slice(0, 120) || crypto.randomUUID();
    const ipHash = await requestIpHash(request);
    const notificationId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [];
    if (target.organization_id && target.organization_role === 'leader') {
      statements.push(
        env.DB.prepare(
          `UPDATE organizations SET leader_user_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND leader_user_id = ? AND EXISTS (
             SELECT 1 FROM users WHERE id = ? AND organization_id = ? AND organization_role = 'leader'
           )`,
        ).bind(target.organization_id, userId, userId, target.organization_id),
        env.DB.prepare(
          `INSERT INTO organization_audit_logs (id, organization_id, actor_user_id, action, target_type, target_id, before_json, after_json, request_id, ip_hash)
           SELECT ?, ?, ?, 'leader.revoked_for_migration', 'user', ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND organization_id = ? AND organization_role = 'leader')`,
        ).bind(crypto.randomUUID(), target.organization_id, actor.user.id, userId, JSON.stringify({ role: 'leader' }), JSON.stringify({ role: 'member', migratedTo: organizationId }), requestId, ipHash, userId, target.organization_id),
        env.DB.prepare(
          `DELETE FROM user_roles WHERE user_id = ? AND role = 'leader'
           AND EXISTS (SELECT 1 FROM users WHERE id = ? AND organization_id = ? AND organization_role = 'leader')`,
        ).bind(userId, userId, target.organization_id),
      );
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO user_notifications (id, user_id, kind, title, body, action_url)
         SELECT ?, id, 'organization_membership', '已加入组织', ?, '/me/settings' FROM users
         WHERE id = ? AND organization_id IS ?`,
      ).bind(notificationId, `你已加入组织「${organization.name}」。`, userId, target.organization_id),
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, before_json, after_json, request_id, ip_hash)
         SELECT ?, ?, ?, 'member.added', 'user', id, ?, ?, ?, ? FROM users
         WHERE id = ? AND organization_id IS ?`,
      ).bind(crypto.randomUUID(), organizationId, actor.user.id, JSON.stringify({ organizationId: target.organization_id }), JSON.stringify({ organizationId, role: 'member' }), requestId, ipHash, userId, target.organization_id),
      env.DB.prepare(
        `UPDATE users SET organization_id = ?, organization_role = 'member', organization_joined_at = CURRENT_TIMESTAMP,
                updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
         WHERE id = ? AND organization_id IS ?`,
      ).bind(organizationId, userId, target.organization_id),
    );
    const results = await env.DB.batch(statements);
    const updateResult = results[statements.length - 1];
    if (!Number(updateResult?.meta.changes ?? 0)) throw new ApiError(409, 'User organization changed. Reload and try again.');
    return json({ ok: true, userId, organizationId });
  } catch (error) { return errorResponse(error); }
};

export const onRequestDelete: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const body = await readJson<MemberBody>(request);
    const userId = requireString(body.userId, 'userId');
    const target = await env.DB.prepare(
      `SELECT users.id, users.organization_role, users.display_name,
              EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'admin') AS is_administrator
       FROM users WHERE users.id = ? AND users.organization_id = ?`,
    ).bind(userId, organizationId).first<{ id: string; organization_role: string | null; display_name: string; is_administrator: number }>();
    if (!target) throw new ApiError(404, 'Organization member not found');
    if (!actor.isAdmin && userId === actor.user.id) throw new ApiError(409, 'Leader cannot remove themselves');
    if (!actor.isAdmin && target.is_administrator) throw new ApiError(403, 'Leader cannot remove an Administrator');
    if (!actor.isAdmin && target.organization_role === 'leader') throw new ApiError(409, 'Administrator must revoke or replace the Leader first');
    const requestId = request.headers.get('x-request-id')?.slice(0, 120) || crypto.randomUUID();
    const ipHash = await requestIpHash(request);
    const statements: D1PreparedStatement[] = [];
    if (target.organization_role === 'leader') {
      statements.push(
        env.DB.prepare(
          `UPDATE organizations SET leader_user_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND leader_user_id = ? AND EXISTS (
             SELECT 1 FROM users WHERE id = ? AND organization_id = ? AND organization_role = 'leader'
           )`,
        ).bind(organizationId, userId, userId, organizationId),
        env.DB.prepare(
          `DELETE FROM user_roles WHERE user_id = ? AND role = 'leader'
           AND EXISTS (SELECT 1 FROM users WHERE id = ? AND organization_id = ? AND organization_role = 'leader')`,
        ).bind(userId, userId, organizationId),
      );
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO user_notifications (id, user_id, kind, title, body, action_url)
         SELECT ?, id, 'organization_membership', '组织归属已解除', ?, '/me/settings' FROM users
         WHERE id = ? AND organization_id = ?`,
      ).bind(crypto.randomUUID(), `你已被移出组织「${actor.organizationName}」，账户和学习记录不受影响。`, userId, organizationId),
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, before_json, after_json, request_id, ip_hash)
         SELECT ?, ?, ?, 'member.removed', 'user', ?, ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND organization_id = ?)`,
      ).bind(crypto.randomUUID(), organizationId, actor.user.id, userId, JSON.stringify({ organizationId, role: target.organization_role }), JSON.stringify({ organizationId: null, role: null }), requestId, ipHash, userId, organizationId),
      env.DB.prepare(
        `UPDATE users SET organization_id = NULL, organization_role = NULL, organization_joined_at = NULL,
                updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
         WHERE id = ? AND organization_id = ?`,
      ).bind(userId, organizationId),
    );
    const results = await env.DB.batch(statements);
    const updateResult = results[statements.length - 1];
    if (!Number(updateResult?.meta.changes ?? 0)) throw new ApiError(409, 'Member changed. Reload and try again.');
    return json({ ok: true });
  } catch (error) { return errorResponse(error); }
};
