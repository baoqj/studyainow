import { requireUser } from '../../_lib/auth';
import { hashPassword, verifyPassword } from '../../_lib/crypto';
import { sendCredentialChangedEmail } from '../../_lib/email';
import { ApiError, errorResponse, json, readJson, requireString } from '../../_lib/http';

interface PasswordBody { currentPassword?: unknown; newPassword?: unknown; passwordConfirm?: unknown; }

export const onRequestPut: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const user = await requireUser(env.DB, request);
    const body = await readJson<PasswordBody>(request);
    const currentPassword = requireString(body.currentPassword, 'currentPassword');
    const newPassword = requireString(body.newPassword, 'newPassword');
    const passwordConfirm = requireString(body.passwordConfirm, 'passwordConfirm');
    if (newPassword.length < 8 || newPassword.length > 128) throw new ApiError(400, 'Password must be 8 to 128 characters');
    if (newPassword !== passwordConfirm) throw new ApiError(400, 'Passwords do not match');

    const row = await env.DB.prepare('SELECT password_hash, email, username, display_name, preferred_locale FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string; email: string; username: string | null; display_name: string; preferred_locale: string | null }>();
    if (!row || !(await verifyPassword(currentPassword, row.password_hash))) throw new ApiError(401, 'Current password is incorrect');
    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(await hashPassword(newPassword), user.id).run();
    await env.DB.prepare('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL').bind(user.id).run();
    waitUntil(
      sendCredentialChangedEmail(env, row.email, {
        userId: user.id,
        username: row.username ?? row.display_name,
        locale: row.preferred_locale === 'zh-TW' || row.preferred_locale === 'en' || row.preferred_locale === 'fr' || row.preferred_locale === 'es' ? row.preferred_locale : 'zh-CN',
        change: 'password',
        eventId: crypto.randomUUID(),
        securityUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me/settings`,
      }).catch((error) => console.error('Password-change confirmation email failed', error)),
    );
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
