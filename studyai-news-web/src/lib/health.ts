export interface NewsApiHealth {
  ok: true;
  service: 'studyai-news-api';
  version: string;
  release: string;
  environment: string;
  traceId: string;
}

export interface NewsApiFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export type HealthResult =
  | { ok: true; health: NewsApiHealth }
  | { ok: false; message: string };

function isNewsApiHealth(value: unknown): value is NewsApiHealth {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.ok === true
    && candidate.service === 'studyai-news-api'
    && typeof candidate.version === 'string'
    && typeof candidate.release === 'string'
    && typeof candidate.environment === 'string'
    && typeof candidate.traceId === 'string';
}

export async function fetchNewsApiHealth(fetcher: NewsApiFetcher): Promise<HealthResult> {
  try {
    const response = await fetcher.fetch('https://studyai-news-api.internal/api/news/v1/health', {
      headers: {
        accept: 'application/json',
        'x-request-id': crypto.randomUUID(),
      },
    });

    if (!response.ok) {
      return { ok: false, message: `API returned HTTP ${response.status}` };
    }

    const payload: unknown = await response.json();
    return isNewsApiHealth(payload)
      ? { ok: true, health: payload }
      : { ok: false, message: 'API returned an invalid health payload' };
  } catch {
    return { ok: false, message: 'API Service Binding is unavailable' };
  }
}
