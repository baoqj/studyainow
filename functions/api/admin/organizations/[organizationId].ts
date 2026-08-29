import { optionalText } from '../../../_lib/admin';
import { requireAdmin } from '../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString, routeParam } from '../../../_lib/http';
import { organizationType, requireOrganizationPermission, requestIpHash } from '../../../_lib/organizations';

async function readOrganization(db: D1Database, organizationId: string) {
  return db.prepare(
    `SELECT organizations.*,
            COUNT(users.id) AS member_count,
            leaders.display_name AS leader_name, leaders.email AS leader_email,
            COALESCE(organizations.last_active_at, MAX(users.last_login_at)) AS resolved_last_active_at
     FROM organizations
     LEFT JOIN users ON users.organization_id = organizations.id
     LEFT JOIN users leaders ON leaders.id = organizations.leader_user_id
     WHERE organizations.id = ?
     GROUP BY organizations.id`,
  ).bind(organizationId).first();
}

export const onRequestGet: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const organization = await readOrganization(env.DB, organizationId);
    if (!organization) throw new ApiError(404, 'Organization not found');
    return json({ organization, permissions: { administrator: actor.isAdmin, leader: !actor.isAdmin } });
  } catch (error) { return errorResponse(error); }
};

export const onRequestPatch: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const actor = await requireAdmin(env.DB, request);
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const body = await readJson<Record<string, unknown>>(request);
    const expectedUpdatedAt = requireString(body.expectedUpdatedAt, 'expectedUpdatedAt');
    const current = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(organizationId).first<Record<string, unknown>>();
    if (!current) throw new ApiError(404, 'Organization not found');
    if (current.updated_at !== expectedUpdatedAt) throw new ApiError(409, 'Organization changed. Reload and try again.');
    const name = requireString(body.name, 'name').slice(0, 160);
    const type = organizationType(body.type);
    const status = body.status === 'inactive' ? 'inactive' : body.status === 'active' ? 'active' : null;
    if (!status) throw new ApiError(400, 'status must be active or inactive');
    const description = optionalText(body.description, 2_000);
    const contactName = optionalText(body.contactName, 160);
    const contactEmail = optionalText(body.contactEmail, 254)?.toLowerCase() ?? null;
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new ApiError(400, 'A valid contact email is required');
    const notes = optionalText(body.notes, 2_000);
    const requestId = request.headers.get('x-request-id')?.slice(0, 120) || crypto.randomUUID();
    const ipHash = await requestIpHash(request);
    const nextState = { name, type, status, description, contactName, contactEmail, notes };
    const results = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, before_json, after_json, request_id, ip_hash)
         SELECT ?, id, ?, 'organization.updated', 'organization', id, ?, ?, ?, ?
         FROM organizations WHERE id = ? AND updated_at = ?`,
      ).bind(crypto.randomUUID(), actor.id, JSON.stringify(current), JSON.stringify(nextState), requestId, ipHash, organizationId, expectedUpdatedAt),
      env.DB.prepare(
        `UPDATE organizations SET name = ?, type = ?, description = ?, contact_name = ?, contact_email = ?, notes = ?, status = ?,
                updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
         WHERE id = ? AND updated_at = ?`,
      ).bind(name, type, description, contactName, contactEmail, notes, status, organizationId, expectedUpdatedAt),
    ]);
    if (!Number(results[1]?.meta.changes ?? 0)) throw new ApiError(409, 'Organization changed. Reload and try again.');
    return json({ organization: await readOrganization(env.DB, organizationId) });
  } catch (error) { return errorResponse(error); }
};
