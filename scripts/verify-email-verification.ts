import { strict as assert } from 'node:assert';
import { onRequestGet as verifyEmail } from '../functions/api/auth/verify';
import { sha256Base64Url } from '../functions/_lib/crypto';

type State = {
  tokenHash: string;
  tokenConsumedAt: string | null;
  expires: boolean;
  emailVerifiedAt: string | null;
  pointTransactions: number;
};

function createDb(state: State) {
  const statement = (sql: string) => ({
    bind(...values: unknown[]) {
      return {
        async first<T>() {
          if (sql.includes('FROM email_verification_tokens') && sql.includes('JOIN users')) {
            return values[0] === state.tokenHash
              ? { token_id: 'verification-token', user_id: 'learner-1', email_verified_at: state.emailVerifiedAt } as T
              : null;
          }
          if (sql.includes('SELECT email_verified_at FROM users')) return { email_verified_at: state.emailVerifiedAt } as T;
          if (sql.includes('SELECT id FROM badges')) return null;
          if (sql.includes('SELECT id FROM point_transactions')) return null;
          return null;
        },
        async run() {
          if (sql.includes('UPDATE users') && sql.includes('email_verified_at = CURRENT_TIMESTAMP')) {
            if (!state.tokenConsumedAt && state.expires) state.emailVerifiedAt = '2026-08-14 12:00:00';
            return { success: true, meta: { changes: state.emailVerifiedAt ? 1 : 0 } };
          }
          if (sql.includes('UPDATE email_verification_tokens')) {
            if (!state.tokenConsumedAt && state.expires) {
              state.tokenConsumedAt = '2026-08-14 12:00:00';
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          if (sql.includes('INSERT INTO point_transactions')) state.pointTransactions += 1;
          return { success: true, meta: { changes: 1 } };
        },
      };
    },
  });

  return {
    prepare: statement,
    async batch(statements: Array<{ run: () => Promise<unknown> }>) {
      return Promise.all(statements.map((item) => item.run()));
    },
  };
}

async function verify(state: State, token: string) {
  const response = await verifyEmail({
    request: new Request(`https://studyai.now/api/auth/verify?token=${encodeURIComponent(token)}`),
    env: { DB: createDb(state) } as unknown as Env,
  } as Parameters<typeof verifyEmail>[0]);
  return response.headers.get('location');
}

const validToken = 'valid-token';
const state: State = {
  tokenHash: await sha256Base64Url(validToken),
  tokenConsumedAt: null,
  expires: true,
  emailVerifiedAt: null,
  pointTransactions: 0,
};

assert.match(await verify(state, validToken) ?? '', /\/login\?verified=1$/, 'a valid verification link must report success');
assert.ok(state.emailVerifiedAt, 'the first visit must verify the account');
assert.equal(state.tokenConsumedAt, '2026-08-14 12:00:00', 'the first visit must consume the token');
assert.equal(state.pointTransactions, 1, 'verification rewards must be granted once');
assert.match(await verify(state, validToken) ?? '', /\/login\?verified=1$/, 'reopening a consumed link for a verified account must remain successful');
assert.equal(state.pointTransactions, 1, 'reopening a verification link must not duplicate rewards');
assert.match(await verify(state, 'unknown-token') ?? '', /error=verification_invalid$/, 'an unknown token must remain invalid');

const expiredState: State = {
  tokenHash: await sha256Base64Url('expired-token'),
  tokenConsumedAt: null,
  expires: false,
  emailVerifiedAt: null,
  pointTransactions: 0,
};
assert.match(await verify(expiredState, 'expired-token') ?? '', /error=verification_invalid$/, 'an expired token for an unverified account must remain invalid');

console.log('Email verification idempotency passed.');
