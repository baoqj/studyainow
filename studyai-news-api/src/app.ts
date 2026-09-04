import { Hono } from 'hono';
import type { Env } from './env';
import {
  createSource,
  isIngestionAdminAuthorized,
  listSourceHealth,
  probeSourceRequest,
  retireSource,
  runManualIngestion,
  updateSource,
} from './ingestion/admin';
import { inspectNewsSchema } from './schema-health';
import { resolveTraceId } from './trace';

export const API_VERSION = '0.3.1';

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

app.use('/api/admin/news/*', async (context, next) => {
  context.header('cache-control', 'no-store');
  if (!isIngestionAdminAuthorized(context.req.raw, context.env)) {
    context.header('www-authenticate', 'Bearer realm="studyai-news-ingestion"');
    return context.json({
      ok: false as const,
      error: {
        code: 'unauthorized' as const,
        message: 'A valid ingestion operator token is required',
      },
      traceId: context.get('traceId'),
    }, 401);
  }
  await next();
});

app.get('/api/admin/news/sources', async (context) => {
  return context.json({
    ok: true as const,
    sources: await listSourceHealth(context.env.DB),
    traceId: context.get('traceId'),
  });
});

app.post('/api/admin/news/sources/probe', async (context) => {
  try {
    return context.json({
      ok: true as const,
      probe: await probeSourceRequest(context.req.raw),
      traceId: context.get('traceId'),
    });
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'source_probe_failed' as const,
        message: error instanceof Error ? error.message : 'Source probe failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
});

app.post('/api/admin/news/sources', async (context) => {
  try {
    const sourceId = await createSource(context.env, context.req.raw, context.get('traceId'));
    return context.json({
      ok: true as const,
      sourceId,
      status: 'paused' as const,
      policyStatus: 'review_required' as const,
      traceId: context.get('traceId'),
    }, 201);
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'invalid_source' as const,
        message: error instanceof Error ? error.message : 'Source creation failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
});

app.patch('/api/admin/news/sources/:sourceId', async (context) => {
  try {
    const updated = await updateSource(
      context.env,
      context.req.param('sourceId'),
      context.req.raw,
      context.get('traceId'),
    );
    if (!updated) {
      return context.json({
        ok: false as const,
        error: { code: 'source_not_found' as const, message: 'Source not found' },
        traceId: context.get('traceId'),
      }, 404);
    }
    return context.json({ ok: true as const, traceId: context.get('traceId') });
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'invalid_source_update' as const,
        message: error instanceof Error ? error.message : 'Source update failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
});

app.delete('/api/admin/news/sources/:sourceId', async (context) => {
  const updated = await retireSource(
    context.env,
    context.req.param('sourceId'),
    context.get('traceId'),
  );
  if (!updated) {
    return context.json({
      ok: false as const,
      error: { code: 'source_not_found' as const, message: 'Source not found' },
      traceId: context.get('traceId'),
    }, 404);
  }
  return context.json({ ok: true as const, status: 'retired' as const, traceId: context.get('traceId') });
});

app.post('/api/admin/news/sources/:sourceId/run', async (context) => {
  const idempotencyKey = context.req.header('idempotency-key');
  if (!idempotencyKey) {
    return context.json({
      ok: false as const,
      error: { code: 'idempotency_key_required' as const, message: 'Idempotency-Key is required' },
      traceId: context.get('traceId'),
    }, 400);
  }

  try {
    const result = await runManualIngestion(
      context.env,
      context.req.param('sourceId'),
      idempotencyKey,
    );
    if (!result) {
      return context.json({
        ok: false as const,
        error: { code: 'source_not_found' as const, message: 'Source not found or not approved' },
        traceId: context.get('traceId'),
      }, 404);
    }
    return context.json({
      ok: result.status !== 'failed',
      result,
      traceId: context.get('traceId'),
    }, result.status === 'failed' ? 502 : 200);
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'ingestion_request_failed' as const,
        message: error instanceof Error ? error.message : 'Ingestion request failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
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
