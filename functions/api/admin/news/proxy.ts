import { requireAdmin } from '../../../_lib/auth';
import { ApiError, errorResponse } from '../../../_lib/http';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PASSTHROUGH_HEADERS = ['accept', 'content-type', 'idempotency-key', 'x-request-id'] as const;

function configuredServiceSecret(env: Env): string {
  const value = env.NEWS_ADMIN_SERVICE_TOKEN;
  if (!value || value.length < 32) throw new ApiError(503, 'News administration integration is not configured');
  return value;
}

function assertSameOriginMutation(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;
  if (!origin || origin !== requestOrigin || request.headers.get('x-news-csrf') !== '1') {
    throw new ApiError(403, 'News mutation origin could not be verified');
  }
}

export async function proxyAdminNews(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  try {
    const { request, env } = context;
    const user = await requireAdmin(env.DB, request);
    assertSameOriginMutation(request);
    const token = configuredServiceSecret(env);
    if (!env.NEWS_API) throw new ApiError(503, 'News API binding is not configured');

    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, 'https://studyai-news-api.internal');
    const headers = new Headers();
    for (const name of PASSTHROUGH_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('x-studyai-admin-service-token', token);
    headers.set('x-studyai-admin-actor', `studyai-user:${user.id}`);

    const upstream = await env.NEWS_API.fetch(new Request(upstreamUrl, {
      method: request.method,
      headers,
      body: SAFE_METHODS.has(request.method) ? undefined : request.body,
      redirect: 'manual',
    }));
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('set-cookie');
    responseHeaders.delete('www-authenticate');
    responseHeaders.set('cache-control', 'no-store');
    responseHeaders.set('x-content-type-options', 'nosniff');
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
