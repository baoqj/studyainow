export interface PublicArticleCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  articleType: string;
  publishedAt: string;
  correctedAt: string | null;
  category: { slug: string; name: string } | null;
  tags: Array<{ slug: string; name: string }>;
}

export interface PublicSignal {
  id: string;
  title: string;
  summary: string;
  occurredAt: string | null;
  sourceName: string;
  sourceUrl: string;
  sourceTier: string;
  qualityScore: number | null;
  category: { slug: string; name: string } | null;
  tags: Array<{ slug: string; name: string }>;
}

export interface PublicArticle extends PublicArticleCard {
  bodyMarkdown: string;
  locale: string;
  sources: Array<{ name: string; url: string; tier: string }>;
  learningLinks: Array<{
    objectType: 'skill' | 'course';
    coreObjectId: string;
    coreSlug: string;
    coreTitle: string;
    coreUrl: string;
    relevanceScore: number;
    impactType: string;
    evidenceExcerpt: string;
    reason: string;
  }>;
  corrections: Array<{ eventType: string; reason: string; createdAt: string }>;
  aiDisclosure: string;
}

export interface PublicHome {
  featured: PublicArticleCard | null;
  articles: PublicArticleCard[];
  signals: PublicSignal[];
  categories: Array<{ slug: string; name: string; storyCount: number }>;
  disclosure: string;
}

export type NewsApiFetcher = Pick<Fetcher, 'fetch'>;

async function fetchJson<T>(fetcher: NewsApiFetcher, path: string): Promise<T> {
  const response = await fetcher.fetch(`https://studyai-news-api.internal${path}`, {
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null) as ({ ok?: boolean; error?: { message?: string } } & T) | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message || `News API unavailable (${response.status})`);
  }
  return payload;
}

export async function fetchPublicHome(fetcher: NewsApiFetcher): Promise<PublicHome> {
  return fetchJson<PublicHome>(fetcher, '/api/news/v1/home');
}

export async function fetchPublicArticles(fetcher: NewsApiFetcher, filters: { category?: string; tag?: string } = {}): Promise<PublicArticleCard[]> {
  const query = new URLSearchParams({ limit: '50' });
  if (filters.category) query.set('category', filters.category);
  if (filters.tag) query.set('tag', filters.tag);
  const payload = await fetchJson<{ articles: PublicArticleCard[] }>(fetcher, `/api/news/v1/articles?${query}`);
  return payload.articles;
}

export async function fetchPublicArticle(fetcher: NewsApiFetcher, slug: string): Promise<PublicArticle | null> {
  const response = await fetcher.fetch(`https://studyai-news-api.internal/api/news/v1/articles/${encodeURIComponent(slug)}`, {
    headers: { accept: 'application/json' },
  });
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => null) as { ok?: boolean; article?: PublicArticle; error?: { message?: string } } | null;
  if (!response.ok || !payload?.ok || !payload.article) {
    throw new Error(payload?.error?.message || `News API unavailable (${response.status})`);
  }
  return payload.article;
}

export function formatNewsDate(value: string | null): string {
  if (!value) return '时间待核实';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}
