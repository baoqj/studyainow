import { consumeOAuthState, exchangeGoogleCode, fetchGoogleUserInfo, safeRedirectPath, signInWithGoogle } from '../../../_lib/oauth';
import { sendSecurityLoginEmail } from '../../../_lib/email';

function redirectResponse(request: Request, path: string, cookie?: string) {
  const url = new URL(path, new URL(request.url).origin);
  const headers = new Headers({
    location: url.toString(),
    'cache-control': 'no-store',
  });

  if (cookie) {
    headers.set('set-cookie', cookie);
  }

  return new Response(null, {
    status: 302,
    headers,
  });
}

function loginError(request: Request, error: string) {
  const url = new URL('/login', new URL(request.url).origin);
  url.searchParams.set('error', error);
  return redirectResponse(request, `${url.pathname}${url.search}`);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return loginError(request, 'google_failed');
    }

    const redirectTo = safeRedirectPath(await consumeOAuthState(env.DB, state));
    const token = await exchangeGoogleCode(env, request, code);
    const profile = await fetchGoogleUserInfo(token.access_token);
    const session = await signInWithGoogle(env, request, profile);
    if (session.isNewDevice) {
      const recipient = await env.DB.prepare('SELECT email, username, display_name, preferred_locale FROM users WHERE id = ?').bind(session.userId).first<{ email: string; username: string | null; display_name: string; preferred_locale: string | null }>();
      if (recipient) {
        waitUntil(
          sendSecurityLoginEmail(env, recipient.email, {
            userId: session.userId,
            username: recipient.username ?? recipient.display_name,
            locale: recipient.preferred_locale === 'zh-TW' || recipient.preferred_locale === 'en' || recipient.preferred_locale === 'fr' || recipient.preferred_locale === 'es' ? recipient.preferred_locale : 'zh-CN',
            deviceFingerprint: session.deviceFingerprint,
            deviceLabel: session.deviceLabel,
            locationLabel: session.locationLabel,
            occurredAt: new Date().toISOString(),
            securityUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me/settings`,
          }).catch((error) => console.error('Google new-login security email failed', error)),
        );
      }
    }
    const adminRole = await env.DB.prepare("SELECT 1 AS allowed FROM user_roles WHERE user_id = ? AND role = 'admin'")
      .bind(session.userId)
      .first<{ allowed: number }>();

    return redirectResponse(request, adminRole ? '/admin' : redirectTo, session.cookie);
  } catch (error) {
    console.error(error);
    return loginError(request, 'google_failed');
  }
};
