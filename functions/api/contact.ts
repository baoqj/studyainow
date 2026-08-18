import { sha256Base64Url } from '../_lib/crypto';
import { sendEmail } from '../_lib/email';
import { ApiError, errorResponse, json, readJson } from '../_lib/http';

const SUPPORT_EMAIL = 'studyainow@mail.com';
const CONTACT_RATE_LIMIT_SECONDS = 300;

type ContactBody = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
};

function requiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string') throw new ApiError(400, `${field} is required`);
  const text = value.trim();
  if (!text || text.length > maxLength || /[\r\n]/.test(field === 'name' ? text : '')) {
    throw new ApiError(400, `${field} is invalid`);
  }
  return text;
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n]/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function appOrigin(request: Request, env: Env) {
  return (env.APP_ORIGIN || new URL(request.url).origin).replace(/\/$/, '');
}

function requestIdentity(request: Request) {
  const cloudflareIp = request.headers.get('cf-connecting-ip');
  return cloudflareIp || 'anonymous';
}

async function claimRateLimit(env: Env, identity: string) {
  const identityHash = await sha256Base64Url(`studyainow/contact/${identity}`);
  const claim = await env.DB.prepare(
    `INSERT INTO contact_rate_limits (identity_hash, last_submitted_at)
     VALUES (?, CURRENT_TIMESTAMP)
     ON CONFLICT(identity_hash) DO UPDATE SET last_submitted_at = CURRENT_TIMESTAMP
       WHERE contact_rate_limits.last_submitted_at <= datetime('now', ?)`
  ).bind(identityHash, `-${CONTACT_RATE_LIMIT_SECONDS} seconds`).run();

  if (!Number(claim.meta.changes ?? 0)) {
    throw new ApiError(429, 'Please wait before sending another message');
  }
  return identityHash;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let claimedIdentityHash: string | null = null;
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== appOrigin(request, env)) {
      throw new ApiError(403, 'Invalid request origin');
    }

    const body = await readJson<ContactBody>(request);
    // A filled hidden field is a low-cost trap for scripted form spam. We
    // intentionally return success so a bot cannot use it as an oracle.
    if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true });

    const name = requiredText(body.name, 'name', 120);
    const email = requiredText(body.email, 'email', 254).toLowerCase();
    const message = requiredText(body.message, 'message', 5000);
    if (!validEmail(email)) throw new ApiError(400, 'email is invalid');
    if (message.length < 2) throw new ApiError(400, 'message is too short');

    claimedIdentityHash = await claimRateLimit(env, requestIdentity(request));

    const result = await sendEmail(env, {
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `Study AI Now contact: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<h1>New Study AI Now contact message</h1><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      tags: [{ name: 'event', value: 'public-contact' }],
    });

    if (!result.sent) throw new ApiError(503, 'Contact email is not configured');
    return json({ ok: true });
  } catch (error) {
    // A transient delivery failure should not make a real visitor wait out the
    // rate limit. Successful sends retain only a hashed anti-abuse identifier.
    if (claimedIdentityHash) {
      await env.DB.prepare('DELETE FROM contact_rate_limits WHERE identity_hash = ?').bind(claimedIdentityHash).run().catch(() => undefined);
    }
    return errorResponse(error);
  }
};
