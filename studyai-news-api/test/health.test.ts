import { describe, expect, it } from 'vitest';
import { API_VERSION, app } from '../src/app';
import type { Env } from '../src/env';

function schemaDatabase(version = '7'): D1Database {
  return {
    prepare: () => ({
      first: async () => ({ value: version }),
    }),
  } as unknown as D1Database;
}

const testEnv: Env = {
  DB: schemaDatabase(),
  MEDIA: {} as R2Bucket,
  INGEST_ADMIN_TOKEN: 'test-ingestion-token-that-is-long-enough',
  ENVIRONMENT: 'test',
  RELEASE_VERSION: 'test-release',
};

describe('StudyAI News API foundation', () => {
  it('returns a versioned health response and preserves a safe trace ID', async () => {
    const response = await app.request('/api/news/v1/health', {
      headers: {
        'x-request-id': 'p0-0-test-trace',
      },
    }, testEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('p0-0-test-trace');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: 'studyai-news-api',
      version: API_VERSION,
      release: 'test-release',
      environment: 'test',
      database: {
        ok: true,
        currentVersion: 7,
        expectedVersion: 7,
      },
      traceId: 'p0-0-test-trace',
    });
  });

  it('returns 503 when the News schema is missing or outdated', async () => {
    const response = await app.request('/api/news/v1/health', undefined, {
      ...testEnv,
      DB: schemaDatabase('1'),
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      database: {
        ok: false,
        currentVersion: 1,
        expectedVersion: 7,
      },
      error: { code: 'schema_unavailable' },
    });
  });

  it('replaces an unsafe trace ID', async () => {
    const response = await app.request('/api/news/v1/health', {
      headers: {
        'x-request-id': '<script>alert(1)</script>',
      },
    }, testEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns a structured 405 response for unsupported health methods', async () => {
    const response = await app.request('/api/news/v1/health', {
      method: 'POST',
    }, testEnv);

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'method_not_allowed' },
    });
  });

  it('returns a structured 404 response for unknown routes', async () => {
    const response = await app.request('/api/news/v1/missing', undefined, testEnv);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
  });

  it('protects ingestion administration routes with a bearer token', async () => {
    const response = await app.request('/api/admin/news/sources', undefined, {
      ...testEnv,
      INGEST_ADMIN_TOKEN: 'expected-ingestion-token-with-32-characters',
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Bearer');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthorized' },
    });
  });
});
