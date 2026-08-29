import { randomToken, sha256Base64Url, hashPassword } from '../../_lib/crypto';
import { canUseDevelopmentVerificationLink, hasResendConfig, normalizeEmailLocale, sendVerificationEmail } from '../../_lib/email';
import { ApiError, errorResponse, json, readJson, requireString } from '../../_lib/http';
import { sqlTimestampAfter } from '../../_lib/time';
import { resolveInvitation } from '../../_lib/organizations';

interface RegisterBody {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  passwordConfirm?: unknown;
  locale?: unknown;
  invite?: unknown;
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
    const inviteCode = typeof body.invite === 'string' ? body.invite.trim().slice(0, 64) : '';

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
      .prepare('SELECT id, status, email_verified_at, organization_id FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; status: string; email_verified_at: string | null; organization_id: string | null }>();

    if (existingUser?.status === 'suspended') {
      throw new ApiError(403, '该账户已被停用');
    }

    if (existingUser?.email_verified_at) {
      throw new ApiError(409, '该邮箱已注册，请直接登录');
    }

    await ensureUsernameAvailable(env.DB, username, existingUser?.id);

    const userId = existingUser?.id ?? crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const invitation = inviteCode ? await resolveInvitation(env.DB, inviteCode) : null;
    const canJoinInvitation = Boolean(invitation && (!existingUser?.organization_id || existingUser.organization_id === invitation.organization_id));
    const statements: D1PreparedStatement[] = [];

    if (existingUser) {
      statements.push(env.DB.prepare(
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
        .bind(username, username, passwordHash, locale, userId));
    } else {
      statements.push(env.DB.prepare(
          `INSERT INTO users (id, email, display_name, username, password_hash, status, auth_provider, preferred_locale)
           VALUES (?, ?, ?, ?, ?, 'active', 'password', ?)`,
        )
        .bind(userId, email, username, username, passwordHash, locale));
    }

    const token = randomToken();
    const tokenHash = await sha256Base64Url(token);
    const expiresAt = sqlTimestampAfter(24 * 60 * 60 * 1000);
    statements.push(
      env.DB.prepare('INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)').bind(userId, 'user'),
      env.DB.prepare('UPDATE email_verification_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND consumed_at IS NULL').bind(userId),
      env.DB.prepare(
        `INSERT INTO email_verification_tokens (id, user_id, email, token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), userId, email, tokenHash, expiresAt),
    );

    if (invitation && canJoinInvitation) {
      const useId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          `UPDATE organization_invites
           SET used_count = used_count + 1, last_used_at = CURRENT_TIMESTAMP
           WHERE id = ? AND organization_id = ? AND status = 'active'
             AND expires_at > CURRENT_TIMESTAMP
             AND (max_uses IS NULL OR used_count < max_uses)
             AND NOT EXISTS (
               SELECT 1 FROM organization_invite_uses
               WHERE invite_id = organization_invites.id AND user_id = ?
             )
             AND EXISTS (
               SELECT 1 FROM organizations
               WHERE organizations.id = organization_invites.organization_id AND organizations.status = 'active'
             )`,
        ).bind(invitation.id, invitation.organization_id, userId),
        env.DB.prepare(
          `INSERT INTO organization_invite_uses (id, invite_id, organization_id, user_id)
           SELECT ?, ?, ?, ? WHERE changes() = 1`,
        ).bind(useId, invitation.id, invitation.organization_id, userId),
        env.DB.prepare(
          `UPDATE users
           SET organization_id = ?, organization_role = 'member',
               organization_joined_at = COALESCE(organization_joined_at, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM organization_invite_uses WHERE id = ? AND invite_id = ? AND user_id = ?
           )`,
        ).bind(invitation.organization_id, userId, useId, invitation.id, userId),
        env.DB.prepare(
          `INSERT INTO organization_audit_logs
            (id, organization_id, actor_user_id, action, target_type, target_id, after_json, request_id)
           SELECT ?, ?, ?, 'member.joined_by_invite', 'user', ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM organization_invite_uses WHERE id = ?)`,
        ).bind(
          crypto.randomUUID(),
          invitation.organization_id,
          userId,
          userId,
          JSON.stringify({ inviteId: invitation.id }),
          `registration:${userId}:${invitation.id}`,
          useId,
        ),
      );
    }

    await env.DB.batch(statements);

    const joined = invitation && canJoinInvitation
      ? Boolean(await env.DB.prepare(
        `SELECT 1 AS joined FROM organization_invite_uses WHERE invite_id = ? AND user_id = ?`,
      ).bind(invitation.id, userId).first())
      : false;

    const emailResult = await sendVerificationEmail(env, request, email, username, token, { userId, locale });

    return json(
      {
        ok: true,
        email,
        email_result: emailResult,
        invitation: inviteCode
          ? joined
            ? { joined: true, organization_name: invitation?.organization_name }
            : {
              joined: false,
              message: existingUser?.organization_id && invitation && existingUser.organization_id !== invitation.organization_id
                ? '该账户已属于其他组织，本次仅完成普通注册。'
                : '邀请码无效、已过期、已撤销或使用次数已满，本次已按普通注册完成。',
            }
          : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
