import type { NewsApiFetcher } from './health';

const ALLOWED_API_PREFIXES = ['/api/news/v1/'] as const;

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({
    ok: false,
    error: { code, message },
  }, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export function isAllowedNewsApiPath(pathname: string): boolean {
  return ALLOWED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function forwardNewsApi(request: Request, fetcher: NewsApiFetcher): Promise<Response> {
  const incomingUrl = new URL(request.url);
  if (!isAllowedNewsApiPath(incomingUrl.pathname)) {
    return jsonError(404, 'not_found', 'API route not found');
  }

  const upstreamUrl = new URL(incomingUrl);
  upstreamUrl.protocol = 'https:';
  upstreamUrl.host = 'studyai-news-api.internal';

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', incomingUrl.host);
  headers.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });

  return fetcher.fetch(upstreamRequest);
}
