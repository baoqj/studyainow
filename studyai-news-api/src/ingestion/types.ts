export type SourceType = 'rss' | 'atom';
export type TrustTier = 'A' | 'B' | 'C' | 'D';
export type IngestionTrigger = 'scheduled' | 'manual';

export interface IngestionSource {
  id: string;
  name: string;
  homepageUrl: string;
  sourceType: SourceType;
  trustTier: TrustTier;
  language: string;
  scheduleCron: string | null;
  fetchUrl: string;
  allowedHosts: string[];
  maxResponseBytes: number;
  maxItemsPerPoll: number;
  minPollIntervalSeconds: number;
  etag: string | null;
  lastModified: string | null;
  lastContentHash: string | null;
  consecutiveFailures: number;
}

export interface ParsedFeedItem {
  externalId: string;
  canonicalUrl: string;
  title: string;
  author: string | null;
  language: string;
  publishedAt: string | null;
  summary: string | null;
  contentHash: string;
  qualityScore: number;
  qualityFlags: string[];
}

export interface ParsedFeed {
  items: ParsedFeedItem[];
  itemsSeen: number;
  itemsRejected: number;
}

export interface FeedDocument {
  status: 'fetched' | 'not_modified';
  httpStatus: number;
  finalUrl: string;
  contentType: string | null;
  body: Uint8Array | null;
  bytes: number;
  responseHash: string | null;
  etag: string | null;
  lastModified: string | null;
  durationMs: number;
}

export interface IngestionResult {
  runId: string | null;
  sourceId: string;
  status: 'succeeded' | 'not_modified' | 'failed' | 'skipped';
  itemsSeen: number;
  itemsInserted: number;
  itemsUpdated: number;
  itemsDuplicate: number;
  itemsRejected: number;
  qualityAverage: number | null;
  errorCode?: string;
}
