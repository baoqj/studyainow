import { createGoogleAuthUrl } from '../../../_lib/oauth';

function loginRedirect(request: Request, error: string) {
  const url = new URL('/login', new URL(request.url).origin);
  url.searchParams.set('error', error);
  return Response.redirect(url.toString(), 302);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const authUrl = await createGoogleAuthUrl(env, request, url.searchParams.get('redirect_to') ?? '/me');

    return Response.redirect(authUrl, 302);
  } catch {
    return loginRedirect(request, 'google_not_configured');
  }
};
