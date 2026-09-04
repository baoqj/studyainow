import { describe, expect, it, vi } from 'vitest';
import { parseFeedDocument } from '../src/ingestion/feed-parser';
import { fetchFeedDocument, INGESTION_USER_AGENT } from '../src/ingestion/fetcher';
import { assessFeedItemQuality, htmlToPlainText } from '../src/ingestion/quality';
import type { IngestionSource } from '../src/ingestion/types';
import { canonicalizeArticleUrl, validateAllowedTarget } from '../src/ingestion/url';

const source: IngestionSource = {
  id: 'source-test',
  name: 'Test Source',
  homepageUrl: 'https://example.com/news/',
  sourceType: 'rss',
  trustTier: 'A',
  language: 'en',
  scheduleCron: '0 * * * *',
  fetchUrl: 'https://example.com/feed.xml',
  allowedHosts: ['example.com'],
  maxResponseBytes: 1024,
  maxItemsPerPoll: 20,
  minPollIntervalSeconds: 3600,
  etag: '"feed-v1"',
  lastModified: 'Wed, 02 Sep 2026 12:00:00 GMT',
  lastContentHash: null,
  consecutiveFailures: 0,
};

describe('ingestion URL security', () => {
  it('normalizes tracking parameters while retaining meaningful query values', () => {
    expect(canonicalizeArticleUrl(
      'https://example.com/post?utm_source=rss&version=2&fbclid=x#intro',
      source.fetchUrl,
      source.allowedHosts,
    )).toBe('https://example.com/post?version=2');
  });

  it.each([
    'http://example.com/feed.xml',
    'https://127.0.0.1/feed.xml',
    'https://8.8.8.8/feed.xml',
    'https://169.254.169.254/latest/meta-data',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://example.net/feed.xml',
    'https://user:pass@example.com/feed.xml',
  ])('rejects unsafe or non-allowlisted target %s', (url) => {
    expect(() => validateAllowedTarget(url, source.allowedHosts)).toThrow();
  });
});

describe('RSS and Atom parsing', () => {
  it('extracts normalized RSS entries, strips active markup and scores quality', async () => {
    const parsed = await parseFeedDocument(source, `
      <?xml version="1.0"?>
      <rss version="2.0"><channel>
        <item>
          <title>Reliable AI engineering release</title>
          <link>https://example.com/post?utm_medium=feed</link>
          <guid>release-1</guid>
          <pubDate>Wed, 02 Sep 2026 12:00:00 GMT</pubDate>
          <dc:creator>Research Team</dc:creator>
          <description><![CDATA[<!DOCTYPE html><p>This release explains architecture, evaluation, safety, deployment, monitoring, testing, and operational lessons for production AI systems.</p><script>ignore()</script>]]></description>
        </item>
      </channel></rss>
    `, new Date('2026-09-03T00:00:00.000Z'));

    expect(parsed.itemsSeen).toBe(1);
    expect(parsed.itemsRejected).toBe(0);
    expect(parsed.items[0]).toMatchObject({
      externalId: 'release-1',
      canonicalUrl: 'https://example.com/post',
      author: 'Research Team',
      publishedAt: '2026-09-02T12:00:00.000Z',
    });
    expect(parsed.items[0]?.summary).not.toContain('ignore()');
    expect(parsed.items[0]?.qualityScore).toBeGreaterThanOrEqual(70);
  });

  it('supports Atom alternate links and rejects entity declarations', async () => {
    const atomSource = { ...source, sourceType: 'atom' as const };
    const parsed = await parseFeedDocument(atomSource, `
      <?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>tag:example.com,2026:2</id>
          <title>Agent runtime reliability update</title>
          <link rel="alternate" href="https://example.com/agent-runtime" />
          <published>2026-09-01T10:00:00Z</published>
          <author><name>Example Research</name></author>
          <summary>Technical details for a reliable agent runtime release and its evaluation methodology.</summary>
        </entry>
      </feed>
    `);

    expect(parsed.items[0]?.canonicalUrl).toBe('https://example.com/agent-runtime');
    expect(parsed.items[0]?.author).toBe('Example Research');

    await expect(parseFeedDocument(source, `
      <!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <rss><channel><item><title>&xxe;</title></item></channel></rss>
    `)).rejects.toThrow('unsafe_xml_declaration');
  });
});

describe('bounded feed fetching', () => {
  it('uses conditional headers and accepts a 304 response', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 304 }));
    const result = await fetchFeedDocument(source, mockFetch);

    expect(result.status).toBe('not_modified');
    const request = mockFetch.mock.calls[0];
    const headers = new Headers(request?.[1]?.headers);
    expect(headers.get('user-agent')).toBe(INGESTION_USER_AGENT);
    expect(headers.get('if-none-match')).toBe('"feed-v1"');
    expect(headers.get('if-modified-since')).toBe(source.lastModified);
  });

  it('rejects redirects to metadata/private targets and oversized bodies', async () => {
    const redirectFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://169.254.169.254/latest/meta-data' },
    }));
    await expect(fetchFeedDocument(source, redirectFetch)).rejects.toThrow('private_target_forbidden');

    const oversizedFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(1025), {
      status: 200,
      headers: { 'content-type': 'application/rss+xml' },
    }));
    await expect(fetchFeedDocument(source, oversizedFetch)).rejects.toMatchObject({
      code: 'response_too_large',
    });
  });

  it('retains a bounded Retry-After delay for rate-limited sources', async () => {
    const rateLimitedFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {
      status: 429,
      headers: { 'retry-after': '7200' },
    }));

    await expect(fetchFeedDocument(source, rateLimitedFetch)).rejects.toMatchObject({
      code: 'http_429',
      httpStatus: 429,
      retryAfterSeconds: 7200,
    });
  });
});

describe('quality scoring', () => {
  it('marks thin and stale source content without treating it as verified truth', () => {
    const result = assessFeedItemQuality({
      title: 'Short but valid title',
      canonicalUrl: 'https://example.com/old',
      publishedAt: '2020-01-01T00:00:00.000Z',
      author: null,
      contentText: htmlToPlainText('<p>Small update.</p>'),
      trustTier: 'A',
      now: new Date('2026-09-03T00:00:00.000Z'),
    });

    expect(result.flags).toEqual(expect.arrayContaining([
      'missing_author',
      'thin_summary',
      'thin_content',
      'stale_content',
    ]));
    expect(result.score).toBeLessThan(60);
  });
});
