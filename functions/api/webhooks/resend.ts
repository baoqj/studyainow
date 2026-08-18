import { ApiError, errorResponse, json } from '../../_lib/http';

type ResendWebhookPayload = {
  type?: unknown;
  data?: { email_id?: unknown };
};

function base64Bytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function safeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function signatures(header: string) {
  return header
    .split(/\s+/)
    .map((entry) => entry.split(',', 2))
    .filter(([version, value]) => version === 'v1' && Boolean(value))
    .map(([, value]) => value!);
}

async function hasValidResendSignature(env: Env, request: Request, body: string) {
  const signingSecret = env.EMAIL_RESEND_WEBHOOK_SECRET?.trim();
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!signingSecret || !id || !timestamp || !signature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || Math.abs(Date.now() - timestampSeconds * 1000) > 5 * 60 * 1000) return false;

  try {
    const secret = base64Bytes(signingSecret.replace(/^whsec_/, ''));
    const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
    return signatures(signature).some((candidate) => safeEqual(expected, base64Bytes(candidate)));
  } catch {
    return false;
  }
}

/**
 * Receives Resend delivery events at the configured same-origin path. Event
 * data is accepted only after Svix signature verification; the raw payload and
 * recipient address are deliberately neither logged nor stored.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.EMAIL_RESEND_WEBHOOK_SECRET) {
      throw new ApiError(503, 'Resend webhook signing secret is not configured');
    }

    const body = await request.text();
    if (!(await hasValidResendSignature(env, request, body))) {
      throw new ApiError(401, 'Invalid Resend webhook signature');
    }

    const payload = JSON.parse(body) as ResendWebhookPayload;
    const eventType = typeof payload.type === 'string' ? payload.type : '';
    const resendId = typeof payload.data?.email_id === 'string' ? payload.data.email_id : '';
    if (resendId && eventType) {
      if (eventType === 'email.bounced' || eventType === 'email.complained') {
        await env.DB.prepare(
          "UPDATE email_deliveries SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE resend_id = ?",
        ).bind(`Resend ${eventType}`, resendId).run();
      } else if (eventType === 'email.sent' || eventType === 'email.delivered') {
        await env.DB.prepare(
          "UPDATE email_deliveries SET status = 'sent', error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE resend_id = ?",
        ).bind(resendId).run();
      }
    }

    return json({ ok: true, received: true }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
};
