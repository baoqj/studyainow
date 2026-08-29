import { errorResponse, json } from '../../_lib/http';
import { requireOrganizationPermission } from '../../_lib/organizations';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const actor = await requireOrganizationPermission(env.DB, request);
    const organization = await env.DB.prepare(
      `SELECT organizations.*, COUNT(users.id) AS member_count,
              leaders.display_name AS leader_name, leaders.email AS leader_email,
              COALESCE(organizations.last_active_at, MAX(users.last_login_at)) AS resolved_last_active_at
       FROM organizations
       LEFT JOIN users ON users.organization_id = organizations.id
       LEFT JOIN users leaders ON leaders.id = organizations.leader_user_id
       WHERE organizations.id = ? GROUP BY organizations.id`,
    ).bind(actor.organizationId).first();
    return json({ organization, permissions: { administrator: actor.isAdmin, leader: !actor.isAdmin } });
  } catch (error) { return errorResponse(error); }
};
