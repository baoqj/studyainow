import { createSession } from './auth';
import { randomToken, sha256Base64Url } from './crypto';
import { ApiError } from './http';
import { sqlTimestampAfter } from './time';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export function appOrigin(env: Env, request: Request) {
  return env.APP_ORIGIN || new URL(request.url).origin;
}

export function googleRedirectUri(env: Env, request: Request) {
  return new URL('/api/auth/google/callback', appOrigin(env, request)).toString();
}

export function safeRedirectPath(value: string | null | undefined, fallback = '/me') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
}

export async function createGoogleAuthUrl(env: Env, request: Request, redirectTo = '/me') {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, 'Google OAuth is not configured');
  }

  const state = randomToken();
  const stateHash = await sha256Base64Url(state);
  const expiresAt = sqlTimestampAfter(10 * 60 * 1000);

  await env.DB
    .prepare(
      `INSERT INTO oauth_states (id, provider, state_hash, redirect_to, expires_at)
       VALUES (?, 'google', ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), stateHash, safeRedirectPath(redirectTo), expiresAt)
    .run();

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', googleRedirectUri(env, request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');

  return url.toString();
}

export async function consumeOAuthState(db: D1Database, state: string) {
  const stateHash = await sha256Base64Url(state);
  const row = await db
    .prepare(
      `SELECT id, redirect_to
       FROM oauth_states
       WHERE provider = 'google'
         AND state_hash = ?
         AND consumed_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
    )
    .bind(stateHash)
    .first<{ id: string; redirect_to: string }>();

  if (!row) {
    throw new ApiError(400, 'Invalid or expired OAuth state');
  }

  await db.prepare('UPDATE oauth_states SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?').bind(row.id).run();
  return row.redirect_to;
}

export async function exchangeGoogleCode(env: Env, request: Request, code: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(503, 'Google OAuth is not configured');
  }

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: googleRedirectUri(env, request),
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new ApiError(400, 'Could not exchange Google authorization code');
  }

  return (await response.json()) as { access_token: string; token_type: string; expires_in: number };
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new ApiError(400, 'Could not fetch Google profile');
  }

  return (await response.json()) as {
    sub: string;
    email: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
}

function usernameFromEmail(email: string) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 24) || 'google_user';
}

async function uniqueUsername(db: D1Database, base: string) {
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}_${i + 1}`;
    const existing = await db
      .prepare('SELECT id FROM users WHERE lower(username) = lower(?)')
      .bind(candidate)
      .first();
    if (!existing) return candidate;
  }

  return `google_${crypto.randomUUID().slice(0, 8)}`;
}

export async function signInWithGoogle(env: Env, request: Request, profile: Awaited<ReturnType<typeof fetchGoogleUserInfo>>) {
  if (!profile.email || profile.email_verified === false) {
    throw new ApiError(403, 'Google email is not verified');
  }

  const existingOauth = await env.DB
    .prepare(
      `SELECT users.id, users.email, users.display_name
       FROM oauth_accounts
       JOIN users ON users.id = oauth_accounts.user_id
       WHERE oauth_accounts.provider = 'google'
         AND oauth_accounts.provider_user_id = ?`,
    )
    .bind(profile.sub)
    .first<{ id: string; email: string; display_name: string }>();

  let userId = existingOauth?.id;

  if (!userId) {
    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(profile.email.toLowerCase()).first<{ id: string }>();
    userId = existingUser?.id;
  }

  if (!userId) {
    userId = crypto.randomUUID();
    const username = await uniqueUsername(env.DB, usernameFromEmail(profile.email));
    await env.DB
      .prepare(
        `INSERT INTO users (id, email, display_name, username, password_hash, status, email_verified_at, avatar_url, auth_provider)
         VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, ?, 'google')`,
      )
      .bind(userId, profile.email.toLowerCase(), profile.name || username, username, `oauth_google$${profile.sub}`, profile.picture ?? null)
      .run();
    await env.DB.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)')
      .bind(userId, 'user')
      .run();
  } else {
    await env.DB
      .prepare(
        `UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
             avatar_url = COALESCE(?, avatar_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(profile.picture ?? null, userId)
      .run();
  }

  await env.DB
    .prepare(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, profile_json)
       VALUES (?, ?, 'google', ?, ?, ?)
       ON CONFLICT(provider, provider_user_id) DO UPDATE SET
         email = excluded.email,
         profile_json = excluded.profile_json,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(crypto.randomUUID(), userId, profile.sub, profile.email.toLowerCase(), JSON.stringify(profile))
    .run();

  const session = await createSession(env.DB, userId, request);
  await env.DB.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').bind(userId).run();

  return { ...session, userId };
}
