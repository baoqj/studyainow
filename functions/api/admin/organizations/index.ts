import { optionalText, sqliteLike } from '../../../_lib/admin';
import { requireAdmin } from '../../../_lib/auth';
import { sha256Base64Url } from '../../../_lib/crypto';
import { ApiError, clampInt, errorResponse, json, readJson, requireString } from '../../../_lib/http';
import { inviteCode, inviteCodeHint, organizationPublicId, organizationType, requestIpHash } from '../../../_lib/organizations';
import { sqlTimestampAfter } from '../../../_lib/time';

type CreateOrganizationBody = {
  name?: unknown;
  type?: unknown;
  description?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  notes?: unknown;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAdmin(env.DB, request);
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
    const status = ['active', 'inactive'].includes(url.searchParams.get('status') ?? '') ? url.searchParams.get('status')! : '';
    const sort = url.searchParams.get('sort') === 'members' ? 'members' : 'created';
    const direction = url.searchParams.get('direction') === 'asc' ? 'ASC' : 'DESC';
    const page = clampInt(url.searchParams.get('page'), 1, 10_000, 1);
    const limit = clampInt(url.searchParams.get('limit'), 10, 100, 40);
    const predicates: string[] = [];
    const bindings: unknown[] = [];
    if (query) {
      const like = sqliteLike(query);
      predicates.push(`(organizations.name LIKE ? ESCAPE '\\' OR organizations.public_id LIKE ? ESCAPE '\\'
        OR COALESCE(leaders.display_name, '') LIKE ? ESCAPE '\\' OR COALESCE(leaders.email, '') LIKE ? ESCAPE '\\')`);
      bindings.push(like, like, like, like);
    }
    if (status) { predicates.push('organizations.status = ?'); bindings.push(status); }
    const where = predicates.length ? `WHERE ${predicates.join(' AND ')}` : '';
    const order = sort === 'members' ? `member_count ${direction}, organizations.created_at DESC` : `organizations.created_at ${direction}`;

    const [rows, total, summary] = await Promise.all([
      env.DB.prepare(
        `SELECT organizations.id, organizations.public_id, organizations.name, organizations.type,
                organizations.status, organizations.created_at, organizations.updated_at,
                COALESCE(organizations.last_active_at, MAX(users.last_login_at)) AS last_active_at,
                COUNT(users.id) AS member_count,
                organizations.leader_user_id, leaders.display_name AS leader_name, leaders.email AS leader_email
         FROM organizations
         LEFT JOIN users ON users.organization_id = organizations.id
         LEFT JOIN users leaders ON leaders.id = organizations.leader_user_id
         ${where}
         GROUP BY organizations.id
         ORDER BY ${order}
         LIMIT ? OFFSET ?`,
      ).bind(...bindings, limit, (page - 1) * limit).all(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count FROM organizations
         LEFT JOIN users leaders ON leaders.id = organizations.leader_user_id ${where}`,
      ).bind(...bindings).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive,
                (SELECT COUNT(*) FROM users WHERE organization_id IS NOT NULL) AS members,
                SUM(CASE WHEN leader_user_id IS NOT NULL THEN 1 ELSE 0 END) AS with_leader
         FROM organizations`,
      ).first(),
    ]);
    return json({ organizations: rows.results, total: Number(total?.count ?? 0), page, limit, summary });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const actor = await requireAdmin(env.DB, request);
    const body = await readJson<CreateOrganizationBody>(request);
    const name = requireString(body.name, 'name').slice(0, 160);
    const type = organizationType(body.type);
    const description = optionalText(body.description, 2_000);
    const contactName = optionalText(body.contactName, 160);
    const contactEmail = optionalText(body.contactEmail, 254)?.toLowerCase() ?? null;
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new ApiError(400, 'A valid contact email is required');
    const notes = optionalText(body.notes, 2_000);
    const organizationId = crypto.randomUUID();
    const publicId = organizationPublicId();
    const code = inviteCode();
    const tokenHash = await sha256Base64Url(code.toUpperCase());
    const inviteId = crypto.randomUUID();
    const expiresAt = sqlTimestampAfter(30 * 24 * 60 * 60 * 1_000);
    const requestId = request.headers.get('x-request-id')?.slice(0, 120) || crypto.randomUUID();
    const ipHash = await requestIpHash(request);

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO organizations
          (id, public_id, name, type, description, contact_name, contact_email, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(organizationId, publicId, name, type, description, contactName, contactEmail, notes, actor.id),
      env.DB.prepare(
        `INSERT INTO organization_invites
          (id, organization_id, token_hash, code_hint, expires_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(inviteId, organizationId, tokenHash, inviteCodeHint(code), expiresAt, actor.id),
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, after_json, request_id, ip_hash)
         VALUES (?, ?, ?, 'organization.created', 'organization', ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), organizationId, actor.id, organizationId, JSON.stringify({ publicId, name, type, status: 'active', defaultInviteId: inviteId }), requestId, ipHash),
    ]);

    const organization = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(organizationId).first();
    const origin = env.APP_ORIGIN || new URL(request.url).origin;
    return json({
      organization,
      invitation: { id: inviteId, code, link: `${origin}/register?invite=${encodeURIComponent(code)}`, expiresAt },
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
