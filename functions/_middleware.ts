export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  const url = new URL(request.url);
  const host = request.headers.get('host') ?? url.hostname;

  if (host === 'www.aibao.me') {
    url.hostname = 'aibao.me';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  if (host === 'aibao.me' && url.protocol === 'http:') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return next();
};
