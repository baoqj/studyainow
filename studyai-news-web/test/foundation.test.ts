import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchNewsApiHealth, type NewsApiFetcher } from '../src/lib/health';
import { forwardNewsApi, isAllowedNewsApiPath } from '../src/lib/proxy';
import { fetchPublicArticle, fetchPublicHome } from '../src/lib/content';
import { markdownToBlocks } from '../src/lib/markdown';

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

  it('forwards only versioned public News API paths', () => {
    expect(isAllowedNewsApiPath('/api/news/v1/health')).toBe(true);
    expect(isAllowedNewsApiPath('/api/admin/news/sources')).toBe(false);
    expect(isAllowedNewsApiPath('/api/auth/me')).toBe(false);
  });

  it('retires the standalone admin UI and redirects it to the unified control panel', () => {
    const route = readFileSync(new URL('../src/pages/admin/news/index.astro', import.meta.url), 'utf8');
    const catchAll = readFileSync(new URL('../src/pages/admin/news/[...path].astro', import.meta.url), 'utf8');
    for (const source of [route, catchAll]) {
      expect(source).toContain('https://studyai.now');
      expect(source).toContain('Astro.redirect');
      expect(source).toContain('308');
      expect(source).not.toContain('AdminApp');
    }
  });

  it('returns 404 for admin API paths without invoking the private binding', async () => {
    const fetcher: NewsApiFetcher = { fetch: vi.fn() };
    const response = await forwardNewsApi(
      new Request('https://news.studyai.now/api/admin/news/dashboard'),
      fetcher,
    );
    expect(response.status).toBe(404);
    expect(fetcher.fetch).not.toHaveBeenCalled();
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

  it('loads public content only through the private News API binding', async () => {
    const fetcher: NewsApiFetcher = {
      fetch: vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toBe('https://studyai-news-api.internal/api/news/v1/home');
        return Response.json({ ok: true, featured: null, articles: [], signals: [], categories: [], disclosure: 'human gate' });
      }),
    };
    await expect(fetchPublicHome(fetcher)).resolves.toMatchObject({ disclosure: 'human gate' });
    expect(fetcher.fetch).toHaveBeenCalledOnce();
  });

  it('treats withdrawn or missing public articles as absent', async () => {
    const fetcher: NewsApiFetcher = { fetch: vi.fn(async () => Response.json({ ok: false }, { status: 404 })) };
    await expect(fetchPublicArticle(fetcher, 'withdrawn-story')).resolves.toBeNull();
  });

  it('renders article Markdown as escaped structured blocks without raw HTML', () => {
    expect(markdownToBlocks('## 更新\n\n- 第一项\n- <script>alert(1)</script>\n\n正文')).toEqual([
      { type: 'heading', level: 2, text: '更新' },
      { type: 'list', items: ['第一项', '<script>alert(1)</script>'] },
      { type: 'paragraph', text: '正文' },
    ]);
    const component = readFileSync(new URL('../src/components/ArticleBody.astro', import.meta.url), 'utf8');
    expect(component).not.toContain('set:html');
  });

  it('keeps the public site in the StudyAINow global navigation and separates source signals', () => {
    const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
    const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
    for (const label of ['AI课程', '面试题集', '工作机会', '新闻', '简历制作']) expect(layout).toContain(label);
    expect(home).toContain('一手来源动态');
    expect(home).toContain('不代表 StudyAI 编辑观点或独立成稿');
    expect(home).toContain('StudyAI 编辑精选');
  });
});
