import { ADMIN_INTERVIEW_SETS } from '../../../../_lib/interviewCatalog';
import { ApiError, clampInt, errorResponse, json, readJson, requireString, routeParam } from '../../../../_lib/http';
import { requireOrganizationPermission, requestIpHash } from '../../../../_lib/organizations';

type MessageType = 'notice' | 'course' | 'job' | 'interview';
type MessageBody = {
  requestId?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  actionUrl?: unknown;
  contentIds?: unknown;
  target?: unknown;
  recipientIds?: unknown;
};

type ContentReference = { id: string; title: string; route: string; kind: MessageType };

function cleanInternalPath(value: unknown) {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  return path.startsWith('/') && !path.startsWith('//') && path.length <= 500 ? path : null;
}

async function resolveContentReferences(db: D1Database, type: MessageType, input: unknown): Promise<ContentReference[]> {
  if (type === 'notice') return [];
  const ids = Array.isArray(input)
    ? [...new Set(input.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))].slice(0, 20)
    : [];
  if (!ids.length) throw new ApiError(400, 'At least one published content item is required');
  const placeholders = ids.map(() => '?').join(', ');
  if (type === 'course') {
    const result = await db.prepare(
      `SELECT id, title, '/courses/' || slug AS route FROM courses
       WHERE id IN (${placeholders}) AND status = 'published' AND visibility = 'public'`,
    ).bind(...ids).all<{ id: string; title: string; route: string }>();
    if (result.results.length !== ids.length) throw new ApiError(409, 'Only published public courses can be recommended');
    return ids.map((id) => ({ ...result.results.find((item) => item.id === id)!, kind: type }));
  }
  if (type === 'job') {
    const result = await db.prepare(
      `SELECT id, title, '/jobs/' || slug AS route FROM job_postings
       WHERE id IN (${placeholders}) AND status = 'published'`,
    ).bind(...ids).all<{ id: string; title: string; route: string }>();
    if (result.results.length !== ids.length) throw new ApiError(409, 'Only published jobs can be recommended');
    return ids.map((id) => ({ ...result.results.find((item) => item.id === id)!, kind: type }));
  }
  const rows = ids.map((id) => ADMIN_INTERVIEW_SETS.find((item) => item.id === id));
  if (rows.some((item) => !item)) throw new ApiError(409, 'Only published interview sets can be recommended');
  return rows.map((item) => ({ id: item!.id, title: item!.title, route: item!.publicRoute, kind: type }));
}

export const onRequestGet: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    await requireOrganizationPermission(env.DB, request, organizationId);
    const url = new URL(request.url);
    const page = clampInt(url.searchParams.get('page'), 1, 10_000, 1);
    const limit = clampInt(url.searchParams.get('limit'), 10, 100, 30);
    const [total, messages] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM organization_messages WHERE organization_id = ?')
        .bind(organizationId).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT messages.id, messages.message_type, messages.title, messages.body,
                messages.content_refs_json, messages.target_rule, messages.recipient_count,
                messages.request_id, messages.sent_at, users.display_name AS sender_name,
                SUM(CASE WHEN recipients.delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
                SUM(CASE WHEN recipients.delivery_status = 'failed' THEN 1 ELSE 0 END) AS failed_count
         FROM organization_messages messages
         JOIN users ON users.id = messages.sender_user_id
         LEFT JOIN organization_message_recipients recipients ON recipients.message_id = messages.id
         WHERE messages.organization_id = ?
         GROUP BY messages.id
         ORDER BY messages.sent_at DESC, messages.id DESC LIMIT ? OFFSET ?`,
      ).bind(organizationId, limit, (page - 1) * limit).all(),
    ]);
    return json({ messages: messages.results, page, limit, total: Number(total?.count ?? 0) });
  } catch (error) { return errorResponse(error); }
};

export const onRequestPost: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    const actor = await requireOrganizationPermission(env.DB, request, organizationId);
    const organization = await env.DB.prepare('SELECT status FROM organizations WHERE id = ?').bind(organizationId).first<{ status: string }>();
    if (organization?.status !== 'active') throw new ApiError(409, 'Inactive organizations cannot send messages');
    const body = await readJson<MessageBody>(request);
    const requestId = requireString(body.requestId, 'requestId').slice(0, 120);
    const existing = await env.DB.prepare(
      'SELECT id, recipient_count, sent_at FROM organization_messages WHERE organization_id = ? AND request_id = ?',
    ).bind(organizationId, requestId).first();
    if (existing) return json({ message: existing, idempotent: true });
    const type = typeof body.type === 'string' && ['notice', 'course', 'job', 'interview'].includes(body.type)
      ? body.type as MessageType
      : null;
    if (!type) throw new ApiError(400, 'Invalid organization message type');
    const title = requireString(body.title, 'title').slice(0, 120);
    const messageBody = requireString(body.body, 'body').slice(0, 2_000);
    const target = body.target === 'selected' ? 'selected' : body.target === 'all' ? 'all' : null;
    if (!target) throw new ApiError(400, 'target must be all or selected');
    const contentRefs = await resolveContentReferences(env.DB, type, body.contentIds);
    const noticePath = type === 'notice' ? cleanInternalPath(body.actionUrl) : null;

    if (!actor.isAdmin) {
      const daily = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM organization_messages
         WHERE organization_id = ? AND sender_user_id = ? AND sent_at >= datetime('now', '-1 day')`,
      ).bind(organizationId, actor.user.id).first<{ count: number }>();
      if (Number(daily?.count ?? 0) >= 10) throw new ApiError(429, 'Leader daily organization message limit reached');
    }

    const requestedRecipients = target === 'selected' && Array.isArray(body.recipientIds)
      ? [...new Set(body.recipientIds.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))]
      : [];
    if (target === 'selected' && !requestedRecipients.length) throw new ApiError(400, 'Select at least one organization member');
    if (requestedRecipients.length > 500) throw new ApiError(400, 'A message can have at most 500 recipients');
    const recipientClause = target === 'selected' ? `AND id IN (${requestedRecipients.map(() => '?').join(', ')})` : '';
    const recipientBindings: unknown[] = [organizationId, ...requestedRecipients];
    const recipients = await env.DB.prepare(
      `SELECT id FROM users WHERE organization_id = ? AND status = 'active' ${recipientClause} ORDER BY id LIMIT 501`,
    ).bind(...recipientBindings).all<{ id: string }>();
    if (target === 'selected' && recipients.results.length !== requestedRecipients.length) {
      throw new ApiError(403, 'Every recipient must be an active member of this organization');
    }
    if (!recipients.results.length) throw new ApiError(409, 'The organization has no eligible recipients');
    if (recipients.results.length > 500) throw new ApiError(409, 'A message can have at most 500 recipients');

    const messageId = crypto.randomUUID();
    const recipientFilter = target === 'selected' ? `AND users.id IN (${requestedRecipients.map(() => '?').join(', ')})` : '';
    const actionUrl = contentRefs[0]?.route ?? noticePath ?? '/me/notifications';
    const ipHash = await requestIpHash(request);
    const sharedBindings: unknown[] = [organizationId, ...requestedRecipients];
    try {
      await env.DB.batch([
        env.DB.prepare(
        `INSERT INTO organization_messages
          (id, organization_id, sender_user_id, message_type, title, body, content_refs_json, target_rule, recipient_count, request_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(messageId, organizationId, actor.user.id, type, title, messageBody, JSON.stringify(contentRefs), target, recipients.results.length, requestId),
      env.DB.prepare(
        `INSERT INTO user_notifications (id, user_id, kind, title, body, action_url)
         SELECT ? || ':' || users.id, users.id, 'organization_message', ?, ?, ?
         FROM users WHERE users.organization_id = ? AND users.status = 'active' ${recipientFilter}`,
      ).bind(messageId, title, messageBody, actionUrl, ...sharedBindings),
      env.DB.prepare(
        `INSERT INTO organization_message_recipients
          (id, message_id, organization_id, user_id, notification_id)
         SELECT ? || ':' || users.id, ?, ?, users.id, ? || ':' || users.id
         FROM users WHERE users.organization_id = ? AND users.status = 'active' ${recipientFilter}`,
      ).bind(messageId, messageId, organizationId, messageId, ...sharedBindings),
      env.DB.prepare(
        `INSERT INTO organization_audit_logs
          (id, organization_id, actor_user_id, action, target_type, target_id, after_json, request_id, ip_hash)
         VALUES (?, ?, ?, 'message.sent', 'message', ?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), organizationId, actor.user.id, messageId, JSON.stringify({ type, target, recipientCount: recipients.results.length, contentIds: contentRefs.map((item) => item.id) }), requestId, ipHash),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        const duplicate = await env.DB.prepare(
          'SELECT id, recipient_count, sent_at FROM organization_messages WHERE organization_id = ? AND request_id = ?',
        ).bind(organizationId, requestId).first();
        if (duplicate) return json({ message: duplicate, idempotent: true });
      }
      throw error;
    }
    return json({ message: { id: messageId, recipient_count: recipients.results.length, sent_at: new Date().toISOString() } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
};
