import { Hono } from 'hono';
import type { Env } from './env';
import { inspectNewsSchema } from './schema-health';
import { resolveTraceId } from './trace';

export const API_VERSION = '0.2.0';

type Bindings = {
  Bindings: Env;
  Variables: {
    traceId: string;
  };
};

export const app = new Hono<Bindings>();

app.use('*', async (context, next) => {
  const traceId = resolveTraceId(context.req.raw);
  context.set('traceId', traceId);

  await next();

  context.header('x-request-id', traceId);
  context.header('x-content-type-options', 'nosniff');
  context.header('referrer-policy', 'no-referrer');
});

app.get('/api/news/v1/health', async (context) => {
  const database = await inspectNewsSchema(context.env.DB);
  const baseResponse = {
    service: 'studyai-news-api' as const,
    version: API_VERSION,
    release: context.env.RELEASE_VERSION,
    environment: context.env.ENVIRONMENT,
    database,
    traceId: context.get('traceId'),
  };

  if (!database.ok) {
    return context.json({
      ok: false as const,
      ...baseResponse,
      error: {
        code: 'schema_unavailable' as const,
        message: 'News database schema is unavailable or outdated',
      },
    }, 503, {
      'cache-control': 'no-store',
    });
  }

  return context.json({
    ok: true as const,
    ...baseResponse,
  }, 200, {
    'cache-control': 'no-store',
  });
});

app.all('/api/news/v1/health', (context) => {
  context.header('allow', 'GET');
  return context.json({
    ok: false as const,
    error: {
      code: 'method_not_allowed' as const,
      message: 'Method not allowed',
    },
    traceId: context.get('traceId'),
  }, 405);
});

app.notFound((context) => {
  return context.json({
    ok: false as const,
    error: {
      code: 'not_found' as const,
      message: 'Route not found',
    },
    traceId: context.get('traceId'),
  }, 404);
});

app.onError((error, context) => {
  console.error('Unhandled API error', {
    traceId: context.get('traceId'),
    name: error.name,
  });

  return context.json({
    ok: false as const,
    error: {
      code: 'internal_error' as const,
      message: 'Internal server error',
    },
    traceId: context.get('traceId'),
  }, 500);
});
