import type { Env } from '../env';
import { parseFeedDocument, PARSER_VERSION } from './feed-parser';
import { fetchFeedDocument, IngestionFetchError } from './fetcher';
import { sha256Hex } from './hash';
import {
  beginFetchRun,
  completeFailed,
  completeNotModified,
  completeSucceeded,
  findSnapshotKey,
  getIngestionSource,
  listRunnableSources,
  persistFeedItems,
} from './repository';
import type { IngestionResult, IngestionSource, IngestionTrigger } from './types';

const SCHEDULED_SOURCE_LIMIT = 2;

function addSeconds(date: Date, seconds: number): string {
  return new Date(date.getTime() + seconds * 1000).toISOString();
}

function failureBackoffSeconds(consecutiveFailures: number): number {
  return Math.min(6 * 60 * 60, Math.max(5 * 60, 60 * (2 ** (consecutiveFailures + 1))));
}

function ingestionError(error: unknown): {
  code: string;
  message: string;
  httpStatus: number | null;
  retryAfterSeconds: number | null;
} {
  if (error instanceof IngestionFetchError) {
    return {
      code: error.code,
      message: error.message,
      httpStatus: error.httpStatus ?? null,
      retryAfterSeconds: error.retryAfterSeconds ?? null,
    };
  }
  if (error instanceof Error && /^[a-z0-9_:-]+$/i.test(error.message)) {
    return {
      code: error.message.slice(0, 120),
      message: error.message,
      httpStatus: null,
      retryAfterSeconds: null,
    };
  }
  return {
    code: 'ingestion_error',
    message: 'Ingestion failed',
    httpStatus: null,
    retryAfterSeconds: null,
  };
}

async function runIdempotencyKey(
  source: IngestionSource,
  trigger: IngestionTrigger,
  requestedAt: Date,
  manualKey?: string,
): Promise<string> {
  if (trigger === 'manual') {
    if (!manualKey || !/^[A-Za-z0-9._:-]{8,120}$/.test(manualKey)) {
      throw new Error('invalid_idempotency_key');
    }
    return `ingest:${source.id}:manual:${manualKey}`;
  }

  const bucket = Math.floor(
    requestedAt.getTime() / (source.minPollIntervalSeconds * 1000),
  );
  return `ingest:${source.id}:scheduled:${bucket}`;
}

function snapshotKey(sourceId: string, runId: string, date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `source-feed/${sourceId}/${year}/${month}/${day}/${runId}.xml`;
}

export async function ingestSource(
  env: Env,
  source: IngestionSource,
  options: {
    trigger: IngestionTrigger;
    requestedAt?: Date;
    manualKey?: string;
    fetchImplementation?: typeof fetch;
  },
): Promise<IngestionResult> {
  const requestedAt = options.requestedAt ?? new Date();
  const idempotencyKey = await runIdempotencyKey(
    source,
    options.trigger,
    requestedAt,
    options.manualKey,
  );
  const runId = `run_${(await sha256Hex(idempotencyKey)).slice(0, 32)}`;
  const started = await beginFetchRun(
    env.DB,
    runId,
    source.id,
    options.trigger,
    idempotencyKey,
    requestedAt.toISOString(),
    PARSER_VERSION,
  );

  if (!started) {
    return {
      runId: null,
      sourceId: source.id,
      status: 'skipped',
      itemsSeen: 0,
      itemsInserted: 0,
      itemsUpdated: 0,
      itemsDuplicate: 0,
      itemsRejected: 0,
      qualityAverage: null,
    };
  }

  try {
    const document = await fetchFeedDocument(source, options.fetchImplementation);
    const finishedAt = new Date();
    const completionBase = {
      runId,
      sourceId: source.id,
      finishedAt: finishedAt.toISOString(),
      nextAllowedAt: addSeconds(finishedAt, source.minPollIntervalSeconds),
      httpStatus: document.httpStatus,
      responseBytes: document.bytes,
      durationMs: document.durationMs,
      etag: document.etag,
      lastModified: document.lastModified,
      responseHash: document.responseHash,
    };

    if (
      document.status === 'not_modified'
      || (
        document.responseHash !== null
        && document.responseHash === source.lastContentHash
        && source.lastParserVersion === PARSER_VERSION
      )
    ) {
      await completeNotModified(env.DB, completionBase);
      return {
        runId,
        sourceId: source.id,
        status: 'not_modified',
        itemsSeen: 0,
        itemsInserted: 0,
        itemsUpdated: 0,
        itemsDuplicate: 0,
        itemsRejected: 0,
        qualityAverage: null,
      };
    }

    if (!document.body || !document.responseHash) throw new Error('missing_feed_body');
    const parsed = await parseFeedDocument(
      source,
      new TextDecoder().decode(document.body),
      finishedAt,
    );
    const itemCounts = await persistFeedItems(env.DB, source, parsed.items, finishedAt.toISOString());
    const qualityAverage = parsed.items.reduce((sum, item) => sum + item.qualityScore, 0)
      / parsed.items.length;
    const existingSnapshotKey = await findSnapshotKey(env.DB, source.id, document.responseHash);
    const objectKey = existingSnapshotKey ?? snapshotKey(source.id, runId, finishedAt);
    const snapshotId = `snapshot_${(await sha256Hex(`${source.id}\n${document.responseHash}`)).slice(0, 32)}`;
    const existingSnapshot = existingSnapshotKey
      ? await env.MEDIA.head(existingSnapshotKey)
      : null;

    if (!existingSnapshot) {
      await env.MEDIA.put(objectKey, document.body, {
        httpMetadata: {
          contentType: document.contentType ?? 'application/xml',
        },
        customMetadata: {
          sourceId: source.id,
          runId,
          responseHash: document.responseHash,
          accessPolicy: 'restricted',
        },
        sha256: document.responseHash,
      });
    }

    const cursorValue = parsed.items
      .map((item) => item.publishedAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? null;

    await completeSucceeded(env.DB, {
      ...completionBase,
      responseHash: document.responseHash,
      cursorValue,
      itemsSeen: parsed.itemsSeen,
      itemsInserted: itemCounts.inserted,
      itemsUpdated: itemCounts.updated,
      itemsDuplicate: itemCounts.duplicate,
      itemsRejected: parsed.itemsRejected,
      qualityAverage,
      snapshotId,
      snapshotKey: objectKey,
      contentType: document.contentType ?? 'application/xml',
    });

    console.log(JSON.stringify({
      event: 'news.ingestion.succeeded',
      runId,
      sourceId: source.id,
      itemsSeen: parsed.itemsSeen,
      itemsInserted: itemCounts.inserted,
      itemsUpdated: itemCounts.updated,
      itemsDuplicate: itemCounts.duplicate,
      itemsRejected: parsed.itemsRejected,
      qualityAverage: Math.round(qualityAverage * 10) / 10,
    }));

    return {
      runId,
      sourceId: source.id,
      status: 'succeeded',
      itemsSeen: parsed.itemsSeen,
      itemsInserted: itemCounts.inserted,
      itemsUpdated: itemCounts.updated,
      itemsDuplicate: itemCounts.duplicate,
      itemsRejected: parsed.itemsRejected,
      qualityAverage: Math.round(qualityAverage * 10) / 10,
    };
  } catch (error) {
    const failure = ingestionError(error);
    const finishedAt = new Date();
    const backoffSeconds = Math.max(
      failureBackoffSeconds(source.consecutiveFailures),
      failure.retryAfterSeconds ?? 0,
    );
    await completeFailed(env.DB, {
      runId,
      sourceId: source.id,
      finishedAt: finishedAt.toISOString(),
      nextAllowedAt: addSeconds(finishedAt, backoffSeconds),
      httpStatus: failure.httpStatus,
      errorCode: failure.code,
      errorMessage: failure.message,
    });
    console.error(JSON.stringify({
      event: 'news.ingestion.failed',
      runId,
      sourceId: source.id,
      errorCode: failure.code,
    }));
    return {
      runId,
      sourceId: source.id,
      status: 'failed',
      itemsSeen: 0,
      itemsInserted: 0,
      itemsUpdated: 0,
      itemsDuplicate: 0,
      itemsRejected: 0,
      qualityAverage: null,
      errorCode: failure.code,
    };
  }
}

export async function runScheduledIngestion(env: Env, scheduledAt = new Date()): Promise<IngestionResult[]> {
  const sources = await listRunnableSources(env.DB, scheduledAt, SCHEDULED_SOURCE_LIMIT);
  const results: IngestionResult[] = [];
  for (const source of sources) {
    results.push(await ingestSource(env, source, {
      trigger: 'scheduled',
      requestedAt: scheduledAt,
    }));
  }
  return results;
}

export async function runManualIngestion(
  env: Env,
  sourceId: string,
  idempotencyKey: string,
): Promise<IngestionResult | null> {
  const source = await getIngestionSource(env.DB, sourceId);
  if (!source) return null;
  return ingestSource(env, source, {
    trigger: 'manual',
    manualKey: idempotencyKey,
  });
}
