import { requireAdmin } from '../../../_lib/auth';
import { ADMIN_ROLE_KEYS, sqliteLike } from '../../../_lib/admin';
import { clampInt, errorResponse, json } from '../../../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAdmin(env.DB, request);
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
    const requestedRole = url.searchParams.get('role') ?? '';
    const role = ADMIN_ROLE_KEYS.includes(requestedRole as (typeof ADMIN_ROLE_KEYS)[number]) ? requestedRole : '';
    const requestedStatus = url.searchParams.get('status') ?? '';
    const status = ['active', 'suspended'].includes(requestedStatus) ? requestedStatus : '';
    const page = clampInt(url.searchParams.get('page'), 1, 10_000, 1);
    const limit = clampInt(url.searchParams.get('limit'), 10, 100, 40);

    const predicates: string[] = [];
    const bindings: unknown[] = [];
    if (query) {
      predicates.push("(users.display_name LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\' OR COALESCE(users.username, '') LIKE ? ESCAPE '\\')");
      const like = sqliteLike(query);
      bindings.push(like, like, like);
    }
    if (status) {
      predicates.push('users.status = ?');
      bindings.push(status);
    }
    if (role) {
      predicates.push('EXISTS (SELECT 1 FROM user_roles filtered_roles WHERE filtered_roles.user_id = users.id AND filtered_roles.role = ?)');
      bindings.push(role);
    }
    const where = predicates.length ? `WHERE ${predicates.join(' AND ')}` : '';

    const [users, total, summary] = await Promise.all([
      env.DB.prepare(
        `SELECT users.id, users.email, users.display_name, users.username, users.status,
                users.created_at, users.updated_at, users.last_login_at, users.avatar_url,
                users.organization_id, users.organization_role, users.organization_joined_at,
                organizations.name AS organization_name, organizations.public_id AS organization_public_id,
                COALESCE((SELECT role FROM user_roles
                  WHERE user_roles.user_id = users.id
                  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'leader' THEN 2 WHEN 'operator' THEN 3 WHEN 'member' THEN 4 ELSE 5 END
                  LIMIT 1), 'user') AS role,
                COALESCE((SELECT SUM(amount) FROM point_transactions WHERE point_transactions.user_id = users.id), 0) AS points,
                (SELECT subscriptions.status FROM subscriptions
                  WHERE subscriptions.user_id = users.id ORDER BY subscriptions.created_at DESC LIMIT 1) AS subscription_status
         FROM users LEFT JOIN organizations ON organizations.id = users.organization_id ${where}
         ORDER BY users.created_at DESC
         LIMIT ? OFFSET ?`,
      ).bind(...bindings, limit, (page - 1) * limit).all(),
      env.DB.prepare(`SELECT COUNT(*) AS count FROM users ${where}`).bind(...bindings).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN users.status = 'active' THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'member') THEN 1 ELSE 0 END) AS members,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'operator') THEN 1 ELSE 0 END) AS operators,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'leader') THEN 1 ELSE 0 END) AS leaders,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND role = 'admin') THEN 1 ELSE 0 END) AS administrators
         FROM users`,
      ).first(),
    ]);

    return json({ users: users.results, total: total?.count ?? 0, page, limit, summary });
  } catch (error) {
    return errorResponse(error);
  }
};
