import { sha256Base64Url } from '../../../_lib/crypto';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../_lib/http';
import { resolveInvitation } from '../../../_lib/organizations';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<{ invite?: unknown }>(request);
    const code = requireString(body.invite, 'invite').slice(0, 64);
    const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'no-ip';
    const fingerprint = await sha256Base64Url(`${ip}\u0000${request.headers.get('user-agent') ?? ''}`);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM organization_invite_validation_attempts
       WHERE fingerprint_hash = ? AND created_at >= datetime('now', '-15 minutes')`,
    ).bind(fingerprint).first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= 20) throw new ApiError(429, 'Too many invitation checks. Try again later.');
    const invitation = await resolveInvitation(env.DB, code);
    await env.DB.prepare(
      'INSERT INTO organization_invite_validation_attempts (id, fingerprint_hash, success) VALUES (?, ?, ?)',
    ).bind(crypto.randomUUID(), fingerprint, invitation ? 1 : 0).run();
    if (!invitation) return json({ valid: false, message: '邀请码无效、已过期、已撤销或使用次数已满。' });
    return json({ valid: true, organization: { name: invitation.organization_name }, message: `你将加入：${invitation.organization_name}` });
  } catch (error) { return errorResponse(error); }
};
