import { hashPassword, sha256Base64Url } from '../../../_lib/crypto';
import { sendCredentialChangedEmail } from '../../../_lib/email';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../_lib/http';

interface ResetPasswordBody {
  token?: unknown;
  password?: unknown;
  passwordConfirm?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const body = await readJson<ResetPasswordBody>(request);
    const token = requireString(body.token, 'token');
    const password = requireString(body.password, 'password');
    const passwordConfirm = requireString(body.passwordConfirm, 'passwordConfirm');

    if (password.length < 8 || password.length > 128) {
      throw new ApiError(400, '密码长度需要在 8 到 128 个字符之间');
    }

    if (password !== passwordConfirm) {
      throw new ApiError(400, '两次输入的密码不一致');
    }

    const tokenHash = await sha256Base64Url(token);
    const row = await env.DB
      .prepare(
        `SELECT password_reset_tokens.id AS token_id,
                password_reset_tokens.user_id AS user_id,
                users.email AS email,
                users.username AS username,
                users.display_name AS display_name,
                users.preferred_locale AS preferred_locale
         FROM password_reset_tokens
         JOIN users ON users.id = password_reset_tokens.user_id
         WHERE password_reset_tokens.token_hash = ?
           AND password_reset_tokens.consumed_at IS NULL
           AND password_reset_tokens.expires_at > CURRENT_TIMESTAMP
           AND users.status = 'active'`,
      )
      .bind(tokenHash)
      .first<{ token_id: string; user_id: string; email: string; username: string | null; display_name: string; preferred_locale: string | null }>();

    if (!row) {
      throw new ApiError(400, '找回密码链接无效或已过期');
    }

    const passwordHash = await hashPassword(password);

    await env.DB
      .prepare(
        `UPDATE users
         SET password_hash = ?,
             auth_provider = 'password',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(passwordHash, row.user_id)
      .run();

    await env.DB
      .prepare('UPDATE password_reset_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(row.token_id)
      .run();

    await env.DB
      .prepare('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL')
      .bind(row.user_id)
      .run();

    waitUntil(
      sendCredentialChangedEmail(env, row.email, {
        userId: row.user_id,
        username: row.username ?? row.display_name,
        locale: row.preferred_locale === 'zh-TW' || row.preferred_locale === 'en' || row.preferred_locale === 'fr' || row.preferred_locale === 'es' ? row.preferred_locale : 'zh-CN',
        change: 'password',
        eventId: row.token_id,
        securityUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me/settings`,
      }).catch((error) => console.error('Password-change confirmation email failed', error)),
    );

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
