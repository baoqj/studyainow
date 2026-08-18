import { requireUser } from '../../_lib/auth';
import { ApiError, errorResponse, json, readJson } from '../../_lib/http';

interface UpdateProfileBody {
  username?: unknown;
  displayName?: unknown;
  bio?: unknown;
  preferredLocale?: unknown;
  notificationEmailEnabled?: unknown;
  marketingEmailEnabled?: unknown;
}

function optionalText(value: unknown, name: string, max: number) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new ApiError(400, `${name} must be text`);
  const text = value.trim();
  if (text.length > max) throw new ApiError(400, `${name} is too long`);
  return text;
}

function validateUsername(username: string) {
  if (username.length < 2 || username.length > 40 || /[\s@]/.test(username)) {
    throw new ApiError(400, 'Username must be 2 to 40 characters and contain no spaces or @');
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const [profile, badges, points] = await Promise.all([
      env.DB
        .prepare(
          `SELECT id, email, display_name, username, avatar_url, bio, preferred_locale, notification_email_enabled, marketing_email_enabled, email_verified_at, created_at
           FROM users WHERE id = ?`,
        )
        .bind(user.id)
        .first(),
      env.DB
        .prepare(
          `SELECT badges.slug, badges.name, badges.description, badges.icon, user_badges.awarded_at
           FROM user_badges JOIN badges ON badges.id = user_badges.badge_id
           WHERE user_badges.user_id = ? ORDER BY user_badges.awarded_at DESC`,
        )
        .bind(user.id)
        .all(),
      env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM point_transactions WHERE user_id = ?').bind(user.id).first<{ balance: number }>(),
    ]);
    return json({ profile, badges: badges.results, points: Number(points?.balance ?? 0) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const body = await readJson<UpdateProfileBody>(request);
    const username = optionalText(body.username, 'username', 40);
    const displayName = optionalText(body.displayName, 'displayName', 80);
    const bio = optionalText(body.bio, 'bio', 800);
    const preferredLocale = optionalText(body.preferredLocale, 'preferredLocale', 12);
    const notificationEmailEnabled = body.notificationEmailEnabled === undefined
      ? undefined
      : body.notificationEmailEnabled === true || body.notificationEmailEnabled === false
        ? body.notificationEmailEnabled
        : (() => { throw new ApiError(400, 'notificationEmailEnabled must be boolean'); })();
    const marketingEmailEnabled = body.marketingEmailEnabled === undefined
      ? undefined
      : body.marketingEmailEnabled === true || body.marketingEmailEnabled === false
        ? body.marketingEmailEnabled
        : (() => { throw new ApiError(400, 'marketingEmailEnabled must be boolean'); })();

    if (username !== undefined) {
      validateUsername(username);
      const existing = await env.DB.prepare('SELECT id FROM users WHERE lower(username) = lower(?) AND id <> ?').bind(username, user.id).first();
      if (existing) throw new ApiError(409, 'Username is already in use');
    }
    if (preferredLocale && !['zh-CN', 'zh-TW', 'en', 'fr', 'es'].includes(preferredLocale)) {
      throw new ApiError(400, 'Unsupported preferred locale');
    }

    await env.DB
      .prepare(
        `UPDATE users SET username = COALESCE(?, username), display_name = COALESCE(?, display_name),
         bio = COALESCE(?, bio), preferred_locale = COALESCE(?, preferred_locale),
         notification_email_enabled = COALESCE(?, notification_email_enabled),
         marketing_email_enabled = COALESCE(?, marketing_email_enabled), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(username ?? null, displayName ?? null, bio ?? null, preferredLocale ?? null, notificationEmailEnabled === undefined ? null : notificationEmailEnabled ? 1 : 0, marketingEmailEnabled === undefined ? null : marketingEmailEnabled ? 1 : 0, user.id)
      .run();

    const profile = await env.DB
      .prepare('SELECT id, email, display_name, username, avatar_url, bio, preferred_locale, notification_email_enabled, marketing_email_enabled, email_verified_at FROM users WHERE id = ?')
      .bind(user.id)
      .first();
    return json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
};
