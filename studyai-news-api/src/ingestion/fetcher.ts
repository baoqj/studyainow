import { sha256Hex } from './hash';
import type { FeedDocument, IngestionSource } from './types';
import { validateAllowedTarget } from './url';

export const INGESTION_USER_AGENT = 'StudyAI-NewsBot/0.1 (+https://news.studyai.now/about)';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export class IngestionFetchError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'IngestionFetchError';
  }
}

function retryAfterSeconds(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Math.min(24 * 60 * 60, Number(value));
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.min(24 * 60 * 60, Math.max(0, Math.ceil((timestamp - now) / 1000)));
}

async function readLimitedBody(response: Response, maximumBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > maximumBytes) {
    await response.body?.cancel();
    throw new IngestionFetchError('response_too_large', 'Feed exceeds the configured response limit');
  }

  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new IngestionFetchError('response_too_large', 'Feed exceeds the configured response limit');
    }
    chunks.push(value);
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function fetchFeedDocument(
  source: IngestionSource,
  fetchImplementation: typeof fetch = fetch,
): Promise<FeedDocument> {
  const startedAt = Date.now();
  let currentUrl = validateAllowedTarget(source.fetchUrl, source.allowedHosts).toString();
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const headers = new Headers({
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
      'user-agent': INGESTION_USER_AGENT,
    });
    if (source.etag) headers.set('if-none-match', source.etag);
    if (source.lastModified) headers.set('if-modified-since', source.lastModified);

    try {
      response = await fetchImplementation(currentUrl, {
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      throw new IngestionFetchError(
        'network_error',
        error instanceof Error ? error.message : 'Feed request failed',
      );
    }

    if (response.status === 304 || response.status < 300 || response.status >= 400) break;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new IngestionFetchError('redirect_without_location', 'Redirect has no location');
    if (redirectCount === MAX_REDIRECTS) {
      throw new IngestionFetchError('too_many_redirects', 'Feed exceeded the redirect limit');
    }

    currentUrl = validateAllowedTarget(
      new URL(location, currentUrl).toString(),
      source.allowedHosts,
    ).toString();
  }

  if (!response) throw new IngestionFetchError('network_error', 'Feed request did not return a response');

  const durationMs = Date.now() - startedAt;
  const base = {
    httpStatus: response.status,
    finalUrl: currentUrl,
    contentType: response.headers.get('content-type'),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    durationMs,
  };

  if (response.status === 304) {
    await response.body?.cancel();
    return {
      ...base,
      status: 'not_modified',
      body: null,
      bytes: 0,
      responseHash: null,
    };
  }

  if (!response.ok) {
    await response.body?.cancel();
    throw new IngestionFetchError(
      `http_${response.status}`,
      `Feed returned HTTP ${response.status}`,
      response.status,
      retryAfterSeconds(response.headers.get('retry-after')),
    );
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!/(xml|rss|atom)/.test(contentType)) {
    await response.body?.cancel();
    throw new IngestionFetchError('unsupported_content_type', 'Feed response is not RSS, Atom or XML');
  }

  const body = await readLimitedBody(response, source.maxResponseBytes);
  if (body.byteLength === 0) throw new IngestionFetchError('empty_response', 'Feed response is empty');

  return {
    ...base,
    status: 'fetched',
    body,
    bytes: body.byteLength,
    responseHash: await sha256Hex(body),
  };
}
