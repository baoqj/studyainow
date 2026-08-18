import { createSession } from '../../_lib/auth';
import { verifyPassword } from '../../_lib/crypto';
import { sendSecurityLoginEmail } from '../../_lib/email';
import { ApiError, errorResponse, json, readJson, requireString } from '../../_lib/http';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const body = await readJson<LoginBody>(request);
    const email = requireString(body.email, 'email').toLowerCase();
    const password = requireString(body.password, 'password');

    const user = await env.DB
      .prepare('SELECT id, email, display_name, username, password_hash, status, email_verified_at, avatar_url, preferred_locale FROM users WHERE email = ?')
      .bind(email)
      .first<{
        id: string;
        email: string;
        display_name: string;
        username: string | null;
        password_hash: string;
        status: string;
        email_verified_at: string | null;
        avatar_url: string | null;
        preferred_locale: string | null;
      }>();

    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'Invalid email or password');
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.email_verified_at) {
      throw new ApiError(403, '请先完成邮箱验证，再登录账户');
    }

    const roles = await env.DB.prepare('SELECT role FROM user_roles WHERE user_id = ?').bind(user.id).all<{ role: string }>();
    const session = await createSession(env.DB, user.id, request);

    await env.DB
      .prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run();

    if (session.isNewDevice) {
      waitUntil(
        sendSecurityLoginEmail(env, user.email, {
          userId: user.id,
          username: user.username ?? user.display_name,
          locale: user.preferred_locale === 'zh-TW' || user.preferred_locale === 'en' || user.preferred_locale === 'fr' || user.preferred_locale === 'es' ? user.preferred_locale : 'zh-CN',
          deviceFingerprint: session.deviceFingerprint,
          deviceLabel: session.deviceLabel,
          locationLabel: session.locationLabel,
          occurredAt: new Date().toISOString(),
          securityUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me/settings`,
        }).catch((error) => console.error('New-login security email failed', error)),
      );
    }

    return json(
      {
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          username: user.username,
          email_verified_at: user.email_verified_at,
          avatar_url: user.avatar_url,
          roles: roles.results.map((item) => item.role),
        },
        expires_at: session.expiresAt,
      },
      {
        headers: {
          'set-cookie': session.cookie,
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
