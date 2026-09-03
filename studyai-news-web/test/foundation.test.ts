import { describe, expect, it, vi } from 'vitest';
import { fetchNewsApiHealth, type NewsApiFetcher } from '../src/lib/health';
import { forwardNewsApi, isAllowedNewsApiPath } from '../src/lib/proxy';

const healthPayload = {
  ok: true as const,
  service: 'studyai-news-api' as const,
  version: '0.1.0',
  release: 'test-release',
  environment: 'test',
  traceId: 'test-trace',
};

describe('StudyAI News web foundation', () => {
  it('validates the API health payload', async () => {
    const fetcher: NewsApiFetcher = {
      fetch: vi.fn(async () => Response.json(healthPayload)),
    };

    await expect(fetchNewsApiHealth(fetcher)).resolves.toEqual({
      ok: true,
      health: healthPayload,
    });
  });

  it('rejects malformed API health payloads', async () => {
    const fetcher: NewsApiFetcher = {
      fetch: vi.fn(async () => Response.json({ ok: true })),
    };

    await expect(fetchNewsApiHealth(fetcher)).resolves.toEqual({
      ok: false,
      message: 'API returned an invalid health payload',
    });
  });

  it('only forwards versioned public and admin News API paths', () => {
    expect(isAllowedNewsApiPath('/api/news/v1/health')).toBe(true);
    expect(isAllowedNewsApiPath('/api/admin/news/sources')).toBe(true);
    expect(isAllowedNewsApiPath('/api/auth/me')).toBe(false);
  });

  it('forwards requests through the internal API origin', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      expect(request.url).toBe('https://studyai-news-api.internal/api/news/v1/health?probe=1');
      expect(request.headers.get('x-forwarded-host')).toBe('news.studyai.now');
      return Response.json(healthPayload);
    });
    const fetcher: NewsApiFetcher = { fetch: fetchMock };

    const response = await forwardNewsApi(
      new Request('https://news.studyai.now/api/news/v1/health?probe=1'),
      fetcher,
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns 404 without invoking the binding for unrelated API paths', async () => {
    const fetcher: NewsApiFetcher = { fetch: vi.fn() };
    const response = await forwardNewsApi(
      new Request('https://news.studyai.now/api/private'),
      fetcher,
    );

    expect(response.status).toBe(404);
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });
});
