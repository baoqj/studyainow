import { ApiError, clampInt, errorResponse, json, routeParam } from '../../../../_lib/http';
import { requireOrganizationPermission } from '../../../../_lib/organizations';

export const onRequestGet: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    await requireOrganizationPermission(env.DB, request, organizationId);
    const url = new URL(request.url);
    const page = clampInt(url.searchParams.get('page'), 1, 10_000, 1);
    const limit = clampInt(url.searchParams.get('limit'), 10, 100, 40);
    const action = url.searchParams.get('action')?.trim().slice(0, 120) ?? '';
    const search = url.searchParams.get('search')?.trim().slice(0, 120) ?? '';
    const where = `logs.organization_id = ? AND (? = '' OR logs.action = ?) AND (? = '' OR logs.target_id LIKE '%' || ? || '%' OR logs.action LIKE '%' || ? || '%')`;
    const bindings = [organizationId, action, action, search, search, search];
    const [total, logs] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS count FROM organization_audit_logs logs WHERE ${where}`).bind(...bindings).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT logs.id, logs.action, logs.target_type, logs.target_id, logs.before_json, logs.after_json,
                logs.request_id, logs.created_at, users.display_name AS actor_name, users.email AS actor_email
         FROM organization_audit_logs logs LEFT JOIN users ON users.id = logs.actor_user_id
         WHERE ${where} ORDER BY logs.created_at DESC, logs.id DESC LIMIT ? OFFSET ?`,
      ).bind(...bindings, limit, (page - 1) * limit).all(),
    ]);
    return json({ logs: logs.results, total: Number(total?.count ?? 0), page, limit });
  } catch (error) { return errorResponse(error); }
};
