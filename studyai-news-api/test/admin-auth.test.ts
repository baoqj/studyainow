import { describe, expect, it } from 'vitest';
import {
  authorizeAdminRequest,
  createAdminSessionCookie,
  hasValidMutationOrigin,
  isAdminBearerAuthorized,
} from '../src/admin/auth';
import type { Env } from '../src/env';

const env = {
  INGEST_ADMIN_TOKEN: 'test-admin-secret-that-is-at-least-32-characters',
} as Env;

describe('News admin session authentication', () => {
  it('exchanges a bearer credential for a signed HttpOnly session', async () => {
    const bearerRequest = new Request('https://news.studyai.now/api/admin/news/session', {
      headers: { authorization: `Bearer ${env.INGEST_ADMIN_TOKEN}` },
    });
    expect(isAdminBearerAuthorized(bearerRequest, env)).toBe(true);
    const cookie = await createAdminSessionCookie(env);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    const cookieValue = cookie.split(';')[0]!;
    const identity = await authorizeAdminRequest(new Request(
      'https://news.studyai.now/api/admin/news/articles',
      { headers: { cookie: cookieValue } },
    ), env);
    expect(identity).toMatchObject({ actorRef: 'operator:news-admin', role: 'admin', method: 'session' });
  });

  it('rejects a modified session and cross-origin mutation', async () => {
    const cookie = await createAdminSessionCookie(env);
    const cookieValue = `${cookie.split(';')[0]!}x`;
    await expect(authorizeAdminRequest(new Request(
      'https://news.studyai.now/api/admin/news/articles',
      { headers: { cookie: cookieValue } },
    ), env)).resolves.toBeNull();

    expect(hasValidMutationOrigin(new Request('https://internal/api/admin/news/articles', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'x-forwarded-host': 'news.studyai.now',
        'x-news-csrf': '1',
      },
    }))).toBe(false);
  });
});
