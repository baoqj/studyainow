import robotsParser from 'robots-parser';
import { parseFeedDocument } from './feed-parser';
import { fetchFeedDocument, INGESTION_USER_AGENT } from './fetcher';
import type { IngestionSource, SourceType, TrustTier } from './types';
import { validateAllowedTarget } from './url';

const MAX_ROBOTS_BYTES = 128 * 1024;

export interface SourceProbeInput {
  feedUrl: string;
  allowedHosts: string[];
  sourceType: SourceType;
  trustTier: TrustTier;
  language: string;
  maxItemsPerPoll?: number;
}

export interface SourceProbeResult {
  robotsUrl: string;
  robotsStatus: number;
  robotsAllowed: boolean;
  feedStatus: number;
  contentType: string | null;
  responseBytes: number;
  itemsParsed: number;
  itemsRejected: number;
  averageQuality: number;
  hasEtag: boolean;
  hasLastModified: boolean;
}

async function readRobots(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_ROBOTS_BYTES) throw new Error('robots_response_too_large');
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_ROBOTS_BYTES) {
    throw new Error('robots_response_too_large');
  }
  return body;
}

export async function probeSourceFeed(
  input: SourceProbeInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<SourceProbeResult> {
  const feedUrl = validateAllowedTarget(input.feedUrl, input.allowedHosts);
  const robotsUrl = new URL('/robots.txt', feedUrl).toString();
  const robotsResponse = await fetchImplementation(robotsUrl, {
    headers: { 'user-agent': INGESTION_USER_AGENT },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!robotsResponse.ok) throw new Error(`robots_http_${robotsResponse.status}`);
  const robotsBody = await readRobots(robotsResponse);
  const robotsAllowed = robotsParser(robotsUrl, robotsBody)
    .isAllowed(feedUrl.toString(), 'StudyAI-NewsBot') !== false;
  if (!robotsAllowed) throw new Error('robots_disallowed');

  const source: IngestionSource = {
    id: 'probe',
    name: 'Source probe',
    homepageUrl: feedUrl.origin,
    sourceType: input.sourceType,
    trustTier: input.trustTier,
    language: input.language,
    scheduleCron: null,
    fetchUrl: feedUrl.toString(),
    allowedHosts: input.allowedHosts,
    maxResponseBytes: 1048576,
    maxItemsPerPoll: Math.min(20, Math.max(1, input.maxItemsPerPoll ?? 20)),
    minPollIntervalSeconds: 3600,
    etag: null,
    lastModified: null,
    lastContentHash: null,
    consecutiveFailures: 0,
  };
  const document = await fetchFeedDocument(source, fetchImplementation);
  if (!document.body) throw new Error('probe_feed_body_missing');
  const parsed = await parseFeedDocument(source, new TextDecoder().decode(document.body));
  const averageQuality = parsed.items.reduce((sum, item) => sum + item.qualityScore, 0)
    / parsed.items.length;

  return {
    robotsUrl,
    robotsStatus: robotsResponse.status,
    robotsAllowed,
    feedStatus: document.httpStatus,
    contentType: document.contentType,
    responseBytes: document.bytes,
    itemsParsed: parsed.items.length,
    itemsRejected: parsed.itemsRejected,
    averageQuality: Math.round(averageQuality * 10) / 10,
    hasEtag: Boolean(document.etag),
    hasLastModified: Boolean(document.lastModified),
  };
}
