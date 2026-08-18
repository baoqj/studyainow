import { json } from '../../_lib/http';

type StripeCheckoutSession = {
  id?: unknown;
  payment_intent?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  payment_status?: unknown;
  customer_details?: { email?: unknown } | null;
  metadata?: { source?: unknown } | null;
};

type StripeEvent = {
  type?: unknown;
  data?: { object?: StripeCheckoutSession };
};

function signatureParts(header: string) {
  const parts = new Map<string, string[]>();
  for (const item of header.split(',')) {
    const [key, value] = item.split('=', 2);
    if (key && value) parts.set(key, [...(parts.get(key) ?? []), value]);
  }
  return parts;
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = signatureParts(header);
  const timestamp = parts.get('t')?.[0];
  const signatures = parts.get('v1') ?? [];
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook is not configured' }, { status: 503 });

  const payload = await request.text();
  const verified = await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!verified) return json({ error: 'Invalid Stripe signature' }, { status: 400 });

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return json({ error: 'Invalid Stripe payload' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data?.object;
    if (typeof session?.id === 'string' && session.payment_status === 'paid' && session.metadata?.source === 'studyai.now') {
      await env.DB.prepare(
        `INSERT INTO donations (
          stripe_checkout_session_id, stripe_payment_intent_id, amount_total, currency, payment_status, supporter_email, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(stripe_checkout_session_id) DO UPDATE SET
          stripe_payment_intent_id = excluded.stripe_payment_intent_id,
          amount_total = excluded.amount_total,
          currency = excluded.currency,
          payment_status = excluded.payment_status,
          supporter_email = excluded.supporter_email,
          completed_at = excluded.completed_at`,
      )
        .bind(
          session.id,
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
          typeof session.amount_total === 'number' ? session.amount_total : null,
          typeof session.currency === 'string' ? session.currency : null,
          session.payment_status,
          typeof session.customer_details?.email === 'string' ? session.customer_details.email : null,
        )
        .run();
    }
  }

  return json({ received: true });
};
