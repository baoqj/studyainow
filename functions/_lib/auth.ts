import { ApiError } from './http';
import { randomToken, sha256Base64Url } from './crypto';
import { sqlTimestampAfter } from './time';

const SESSION_COOKIE = 'studyainow_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  status: string;
  email_verified_at: string | null;
  avatar_url: string | null;
  roles: string[];
}

function parseCookies(header: string | null) {
  const cookies = new Map<string, string>();
  if (!header) return cookies;

  header.split(';').forEach((item) => {
    const [key, ...value] = item.trim().split('=');
    if (key) cookies.set(key, decodeURIComponent(value.join('=')));
  });

  return cookies;
}

function cookieBase(request: Request) {
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(request: Request) {
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function createSession(db: D1Database, userId: string, request: Request) {
  const token = randomToken();
  const tokenHash = await sha256Base64Url(token);
  const id = crypto.randomUUID();
  const expiresAt = sqlTimestampAfter(SESSION_MAX_AGE_SECONDS * 1000);
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? '';
  const ipHash = ip ? await sha256Base64Url(ip) : null;
  const userAgent = request.headers.get('user-agent') ?? '';
  const fingerprintHash = await sha256Base64Url(`${userAgent}\u0000${ipHash ?? 'no-ip'}`);
  const cf = request.cf as { country?: string; city?: string } | undefined;
  const countryCode = typeof cf?.country === 'string' ? cf.country.slice(0, 8) : null;
  const city = typeof cf?.city === 'string' ? cf.city.slice(0, 160) : null;
  const [hasPriorDevice, knownDevice] = await Promise.all([
    db.prepare('SELECT 1 AS value FROM account_login_devices WHERE user_id = ? LIMIT 1').bind(userId).first<{ value: number }>(),
    db.prepare('SELECT 1 AS value FROM account_login_devices WHERE user_id = ? AND fingerprint_hash = ? LIMIT 1').bind(userId, fingerprintHash).first<{ value: number }>(),
  ]);

  await db.batch([
    db
      .prepare(
        `INSERT INTO sessions (id, user_id, token_hash, user_agent, ip_hash, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, tokenHash, userAgent || null, ipHash, expiresAt),
    db
      .prepare(
        `INSERT INTO account_login_devices (id, user_id, fingerprint_hash, user_agent, country_code, city)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, fingerprint_hash) DO UPDATE SET
           user_agent = excluded.user_agent,
           country_code = excluded.country_code,
           city = excluded.city,
           last_seen_at = CURRENT_TIMESTAMP`,
      )
      .bind(crypto.randomUUID(), userId, fingerprintHash, userAgent.slice(0, 1_000) || null, countryCode, city),
  ]);

  return {
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieBase(request)}`,
    expiresAt,
    isNewDevice: Boolean(hasPriorDevice && !knownDevice),
    deviceFingerprint: fingerprintHash,
    deviceLabel: describeDevice(userAgent),
    locationLabel: [city, countryCode].filter(Boolean).join(', '),
  };
}

function describeDevice(userAgent: string) {
  const browser = /edg\//i.test(userAgent) ? 'Microsoft Edge'
    : /firefox\//i.test(userAgent) ? 'Firefox'
      : /chrome\//i.test(userAgent) ? 'Chrome'
        : /safari\//i.test(userAgent) ? 'Safari'
          : 'Web browser';
  const platform = /iphone|ipad/i.test(userAgent) ? 'iOS'
    : /android/i.test(userAgent) ? 'Android'
      : /mac os/i.test(userAgent) ? 'macOS'
        : /windows/i.test(userAgent) ? 'Windows'
          : /linux/i.test(userAgent) ? 'Linux'
            : '';
  return platform ? `${browser} on ${platform}` : browser;
}

export async function getAuthUser(db: D1Database, request: Request): Promise<AuthUser | null> {
  const token = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await sha256Base64Url(token);
  const row = await db
    .prepare(
      `SELECT users.id, users.email, users.display_name, users.status
              , users.username, users.email_verified_at, users.avatar_url
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?
         AND sessions.revoked_at IS NULL
         AND sessions.expires_at > CURRENT_TIMESTAMP
         AND users.status = 'active'`,
    )
    .bind(tokenHash)
    .first<Omit<AuthUser, 'roles'>>();

  if (!row) return null;

  await db
    .prepare('UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?')
    .bind(tokenHash)
    .run();

  const roles = await db
    .prepare('SELECT role FROM user_roles WHERE user_id = ?')
    .bind(row.id)
    .all<{ role: string }>();

  return {
    ...row,
    roles: roles.results.map((item) => item.role),
  };
}

export async function requireUser(db: D1Database, request: Request) {
  const user = await getAuthUser(db, request);

  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  return user;
}

export async function requireAdmin(db: D1Database, request: Request) {
  const user = await requireUser(db, request);

  if (!user.roles.includes('admin')) {
    throw new ApiError(403, 'Admin role required');
  }

  return user;
}

export async function revokeSession(db: D1Database, request: Request) {
  const token = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE);
  if (!token) return;

  const tokenHash = await sha256Base64Url(token);
  await db
    .prepare('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?')
    .bind(tokenHash)
    .run();
}
