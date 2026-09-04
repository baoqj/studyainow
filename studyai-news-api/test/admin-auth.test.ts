import { describe, expect, it } from 'vitest';
import {
  authorizeAdminRequest,
  isAdminBearerAuthorized,
} from '../src/admin/auth';
import type { Env } from '../src/env';

const env = {
  INGEST_ADMIN_TOKEN: 'test-admin-secret-that-is-at-least-32-characters',
  STUDYAI_ADMIN_SERVICE_TOKEN: 'test-service-secret-that-is-at-least-32-characters',
} as Env;

describe('News admin service authentication', () => {
  it('keeps the operational bearer credential for non-browser administration', async () => {
    const bearerRequest = new Request('https://news-api.internal/api/admin/news/dashboard', {
      headers: { authorization: `Bearer ${env.INGEST_ADMIN_TOKEN}` },
    });
    expect(isAdminBearerAuthorized(bearerRequest, env)).toBe(true);
    await expect(authorizeAdminRequest(bearerRequest, env)).resolves.toMatchObject({
      actorRef: 'operator:news-admin', role: 'admin', method: 'bearer',
    });
  });

  it('accepts only the central admin proxy token with a validated actor', async () => {
    const request = new Request('https://news-api.internal/api/admin/news/articles', {
      headers: {
        'x-studyai-admin-service-token': env.STUDYAI_ADMIN_SERVICE_TOKEN!,
        'x-studyai-admin-actor': 'studyai-user:90f4ec4a-7f34-42c1-b6f2-5ce48e9c2586',
      },
    });
    await expect(authorizeAdminRequest(request, env)).resolves.toMatchObject({
      actorRef: 'studyai-user:90f4ec4a-7f34-42c1-b6f2-5ce48e9c2586',
      role: 'admin', method: 'service',
    });

    for (const actorRef of ['operator:news-admin', 'studyai-user:../../admin', '']) {
      await expect(authorizeAdminRequest(new Request(request.url, {
        headers: {
          'x-studyai-admin-service-token': env.STUDYAI_ADMIN_SERVICE_TOKEN!,
          'x-studyai-admin-actor': actorRef,
        },
      }), env)).resolves.toBeNull();
    }
    await expect(authorizeAdminRequest(new Request(request.url, {
      headers: {
        'x-studyai-admin-service-token': `${env.STUDYAI_ADMIN_SERVICE_TOKEN}x`,
        'x-studyai-admin-actor': 'studyai-user:90f4ec4a-7f34-42c1-b6f2-5ce48e9c2586',
      },
    }), env)).resolves.toBeNull();
  });
});
