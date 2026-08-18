import { sha256Base64Url } from '../../_lib/crypto';
import { ApiError, errorResponse } from '../../_lib/http';
import { awardBadge, grantPoints } from '../../_lib/userRewards';

function loginRedirect(request: Request, search: Record<string, string>) {
  const url = new URL('/login', new URL(request.url).origin);
  Object.entries(search).forEach(([key, value]) => url.searchParams.set(key, value));
  // Verification links are opened from webmail WebViews as well as regular
  // browsers. A cacheable or heuristically reused 302 can leave those clients
  // on an older navigation target. A 303 with explicit no-store headers makes
  // the post-verification destination an unconditional fresh GET of Login.
  return new Response(null, {
    status: 303,
    headers: {
      location: url.toString(),
      'cache-control': 'no-store, max-age=0',
      pragma: 'no-cache',
      expires: '0',
      'referrer-policy': 'no-referrer',
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new ApiError(400, 'Verification token is required');
    }

    const tokenHash = await sha256Base64Url(token);
    const row = await env.DB
      .prepare(
        `SELECT email_verification_tokens.id AS token_id,
                email_verification_tokens.user_id AS user_id,
                users.email_verified_at AS email_verified_at
         FROM email_verification_tokens
         JOIN users ON users.id = email_verification_tokens.user_id
         WHERE email_verification_tokens.token_hash = ?
           AND users.status = 'active'`,
      )
      .bind(tokenHash)
      .first<{ token_id: string; user_id: string; email_verified_at: string | null }>();

    if (!row) {
      return loginRedirect(request, { error: 'verification_invalid' });
    }

    // Mail gateways and WebViews can prefetch a verification URL, and users
    // can legitimately open the same link again. A token that has already
    // verified this account is therefore a successful, idempotent outcome.
    if (row.email_verified_at) {
      return loginRedirect(request, { verified: '1' });
    }

    // Claim the token and mark the account verified in one D1 batch. The
    // conditional token update makes concurrent visits single-use, while the
    // following account read turns the losing visit into the same success UI.
    const [, tokenClaim] = await env.DB.batch([
      env.DB.prepare(
        `UPDATE users
         SET email_verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND EXISTS (
             SELECT 1
             FROM email_verification_tokens
             WHERE id = ?
               AND consumed_at IS NULL
               AND expires_at > CURRENT_TIMESTAMP
           )`,
      ).bind(row.user_id, row.token_id),
      env.DB.prepare(
        `UPDATE email_verification_tokens
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND consumed_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP`,
      ).bind(row.token_id),
    ]);

    if (Number(tokenClaim.meta.changes ?? 0) === 0) {
      const user = await env.DB
        .prepare('SELECT email_verified_at FROM users WHERE id = ?')
        .bind(row.user_id)
        .first<{ email_verified_at: string | null }>();
      return user?.email_verified_at
        ? loginRedirect(request, { verified: '1' })
        : loginRedirect(request, { error: 'verification_invalid' });
    }

    // Rewards are post-verification conveniences. They must not turn a
    // successfully verified account into an error page if a reward write is
    // temporarily unavailable.
    try {
      await awardBadge(env.DB, { userId: row.user_id, slug: 'verified-learner', reason: 'Verified email address' });
      await grantPoints(env.DB, { userId: row.user_id, amount: 25, reason: 'Verified email address', referenceType: 'email_verification', referenceId: row.user_id });
    } catch (rewardError) {
      console.error('Email verified, but verification rewards could not be granted', rewardError);
    }

    return loginRedirect(request, { verified: '1' });
  } catch (error) {
    return errorResponse(error);
  }
};
