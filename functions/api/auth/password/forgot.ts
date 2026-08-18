import { randomToken, sha256Base64Url } from '../../../_lib/crypto';
import { sendPasswordResetEmail } from '../../../_lib/email';
import { errorResponse, json, readJson, requireString } from '../../../_lib/http';
import { sqlTimestampAfter } from '../../../_lib/time';

interface ForgotPasswordBody {
  email?: unknown;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<ForgotPasswordBody>(request);
    const email = normalizeEmail(requireString(body.email, 'email'));

    const user = await env.DB
      .prepare(
        `SELECT id, email, display_name, username, status, preferred_locale
         FROM users
         WHERE email = ?
         LIMIT 1`,
      )
      .bind(email)
      .first<{ id: string; email: string; display_name: string; username: string | null; status: string; preferred_locale: string | null }>();

    if (user?.status === 'active') {
      await env.DB
        .prepare('UPDATE password_reset_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND consumed_at IS NULL')
        .bind(user.id)
        .run();

      const token = randomToken();
      const tokenHash = await sha256Base64Url(token);
      const expiresAt = sqlTimestampAfter(30 * 60 * 1000);

      await env.DB
        .prepare(
          `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt)
        .run();

      await sendPasswordResetEmail(env, request, user.email, user.username ?? user.display_name, token, {
        userId: user.id,
        locale: user.preferred_locale === 'zh-TW' || user.preferred_locale === 'en' || user.preferred_locale === 'fr' || user.preferred_locale === 'es' ? user.preferred_locale : 'zh-CN',
      });
    }

    return json({
      ok: true,
      message: '如果该邮箱存在，我们会发送找回密码邮件。',
    });
  } catch (error) {
    return errorResponse(error);
  }
};
