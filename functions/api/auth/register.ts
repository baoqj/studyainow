import { randomToken, sha256Base64Url, hashPassword } from '../../_lib/crypto';
import { canUseDevelopmentVerificationLink, hasResendConfig, normalizeEmailLocale, sendVerificationEmail } from '../../_lib/email';
import { ApiError, errorResponse, json, readJson, requireString } from '../../_lib/http';
import { sqlTimestampAfter } from '../../_lib/time';

interface RegisterBody {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  passwordConfirm?: unknown;
  locale?: unknown;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username: string) {
  if (username.length < 2 || username.length > 40) {
    throw new ApiError(400, '用户名长度需要在 2 到 40 个字符之间');
  }

  if (/[\s@]/.test(username)) {
    throw new ApiError(400, '用户名不能包含空格或 @');
  }
}

async function ensureUsernameAvailable(db: D1Database, username: string, currentUserId?: string) {
  const existing = await db
    .prepare('SELECT id FROM users WHERE lower(username) = lower(?) AND id <> ?')
    .bind(username, currentUserId ?? '')
    .first<{ id: string }>();

  if (existing) {
    throw new ApiError(409, '用户名已被使用');
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<RegisterBody>(request);
    const username = requireString(body.username, 'username');
    const email = normalizeEmail(requireString(body.email, 'email'));
    const password = requireString(body.password, 'password');
    const passwordConfirm = requireString(body.passwordConfirm, 'passwordConfirm');
    const locale = normalizeEmailLocale(body.locale);

    validateUsername(username);

    if (!validateEmail(email)) {
      throw new ApiError(400, '邮箱格式不正确');
    }

    if (password.length < 8 || password.length > 128) {
      throw new ApiError(400, '密码长度需要在 8 到 128 个字符之间');
    }

    if (password !== passwordConfirm) {
      throw new ApiError(400, '两次输入的密码不一致');
    }

    if (!hasResendConfig(env) && !canUseDevelopmentVerificationLink(env, request)) {
      throw new ApiError(503, '邮件服务尚未配置，暂时无法注册');
    }

    const existingUser = await env.DB
      .prepare('SELECT id, status, email_verified_at FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; status: string; email_verified_at: string | null }>();

    if (existingUser?.status === 'suspended') {
      throw new ApiError(403, '该账户已被停用');
    }

    if (existingUser?.email_verified_at) {
      throw new ApiError(409, '该邮箱已注册，请直接登录');
    }

    await ensureUsernameAvailable(env.DB, username, existingUser?.id);

    const userId = existingUser?.id ?? crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    if (existingUser) {
      await env.DB
        .prepare(
          `UPDATE users
           SET display_name = ?,
               username = ?,
               password_hash = ?,
               status = 'active',
               auth_provider = 'password',
               preferred_locale = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(username, username, passwordHash, locale, userId)
        .run();
    } else {
      await env.DB
        .prepare(
          `INSERT INTO users (id, email, display_name, username, password_hash, status, auth_provider, preferred_locale)
           VALUES (?, ?, ?, ?, ?, 'active', 'password', ?)`,
        )
        .bind(userId, email, username, username, passwordHash, locale)
        .run();
    }

    await env.DB.prepare('INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)').bind(userId, 'user').run();
    await env.DB
      .prepare('UPDATE email_verification_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND consumed_at IS NULL')
      .bind(userId)
      .run();

    const token = randomToken();
    const tokenHash = await sha256Base64Url(token);
    const expiresAt = sqlTimestampAfter(24 * 60 * 60 * 1000);

    await env.DB
      .prepare(
        `INSERT INTO email_verification_tokens (id, user_id, email, token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), userId, email, tokenHash, expiresAt)
      .run();

    const emailResult = await sendVerificationEmail(env, request, email, username, token, { userId, locale });

    return json(
      {
        ok: true,
        email,
        email_result: emailResult,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
