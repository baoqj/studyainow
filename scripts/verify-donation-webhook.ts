import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { onRequestPost as receiveDonationWebhook } from '../functions/api/donations/webhook';

const secret = 'whsec_local_test_secret';
const writes: Array<{ sql: string; values: unknown[] }> = [];
const db = {
  prepare(sql: string) {
    return {
      bind(...values: unknown[]) {
        return {
          async run() {
            writes.push({ sql, values });
            return { success: true, meta: { changes: 1 } };
          },
        };
      },
    };
  },
};

async function signature(payload: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const value = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${value}`;
}

async function post(event: Record<string, unknown>, signatureHeader?: string) {
  const payload = JSON.stringify(event);
  const request = new Request('https://studyai.now/api/stripe/webhook', {
    method: 'POST',
    headers: signatureHeader ? { 'stripe-signature': signatureHeader } : {},
    body: payload,
  });
  return receiveDonationWebhook({ request, env: { DB: db, STRIPE_WEBHOOK_SECRET: secret } as unknown as Env } as Parameters<typeof receiveDonationWebhook>[0]);
}

const paidEvent = {
  type: 'checkout.session.completed',
  data: { object: {
    id: 'cs_test_123', payment_intent: 'pi_test_123', amount_total: 500, currency: 'usd', payment_status: 'paid',
    customer_details: { email: 'supporter@example.test' }, metadata: { source: 'studyai.now' },
  } },
};
const paidPayload = JSON.stringify(paidEvent);
const paidResponse = await post(paidEvent, await signature(paidPayload));
assert.equal(paidResponse.status, 200);
assert.equal(writes.length, 1, 'A completed StudyAI checkout must be recorded once');
assert.match(writes[0].sql, /INSERT INTO donations/);
assert.deepEqual(writes[0].values, ['cs_test_123', 'pi_test_123', 500, 'usd', 'paid', 'supporter@example.test']);

for (const type of ['checkout.session.async_payment_failed', 'payment_intent.payment_failed']) {
  const failedEvent = { type, data: { object: { id: 'ignored' } } };
  const response = await post(failedEvent, await signature(JSON.stringify(failedEvent)));
  assert.equal(response.status, 200, `${type} must be acknowledged so Stripe does not retry it`);
}
assert.equal(writes.length, 1, 'A failed payment must not be recorded as a donation');

const invalidResponse = await post(paidEvent, 't=1,v1=invalid');
assert.equal(invalidResponse.status, 400, 'An invalid Stripe signature must be rejected');

const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
assert.match(worker, /pathname === '\/api\/donations\/webhook' \|\| pathname === '\/api\/stripe\/webhook'/, 'Stripe Destination URL must reach the verified webhook handler');

const prompt = readFileSync(new URL('../src/components/support/SupportPrompt.tsx', import.meta.url), 'utf8');
assert.match(prompt, /tips_wechat\.png/, 'The support prompt must include the WeChat QR-code asset');
assert.match(prompt, /tips_alipay\.png/, 'The support prompt must include the Alipay QR-code asset');
assert.match(prompt, /qrPaymentTitle/, 'The QR payment section must have localized content');

const supportButton = readFileSync(new URL('../src/components/support/SupportButton.tsx', import.meta.url), 'utf8');
assert.match(supportButton, /copy\.footerButton/, 'The compact footer support label must be separate from the full support CTA');
assert.match(supportButton, /whitespace-nowrap/, 'The footer support CTA must keep its icon and compact label on one line');

console.log('Donation webhook verification passed.');
