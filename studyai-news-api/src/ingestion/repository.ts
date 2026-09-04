import { PARSER_VERSION } from './feed-parser';
import { sha256Hex } from './hash';
import type {
  IngestionSource,
  IngestionTrigger,
  ParsedFeedItem,
} from './types';

interface SourceRow {
  id: string;
  name: string;
  base_url: string;
  source_type: 'rss' | 'atom';
  trust_tier: 'A' | 'B' | 'C' | 'D';
  language: string;
  schedule_cron: string | null;
  fetch_url: string;
  allowed_hosts_json: string;
  max_response_bytes: number;
  max_items_per_poll: number;
  min_poll_interval_seconds: number;
  etag: string | null;
  last_modified: string | null;
  last_content_hash: string | null;
  consecutive_failures: number;
}

const SOURCE_SELECT = `
  SELECT
    source.id,
    source.name,
    source.base_url,
    source.source_type,
    source.trust_tier,
    source.language,
    source.schedule_cron,
    policy.fetch_url,
    policy.allowed_hosts_json,
    policy.max_response_bytes,
    policy.max_items_per_poll,
    policy.min_poll_interval_seconds,
    cursor.etag,
    cursor.last_modified,
    cursor.last_content_hash,
    cursor.consecutive_failures
  FROM news_source AS source
  JOIN source_ingestion_policy AS policy ON policy.source_id = source.id
  JOIN source_cursor AS cursor ON cursor.source_id = source.id AND cursor.cursor_key = 'main'
`;

function mapSource(row: SourceRow): IngestionSource {
  const allowedHosts = JSON.parse(row.allowed_hosts_json) as unknown;
  if (!Array.isArray(allowedHosts) || allowedHosts.some((host) => typeof host !== 'string')) {
    throw new Error(`invalid_allowed_hosts:${row.id}`);
  }

  return {
    id: row.id,
    name: row.name,
    homepageUrl: row.base_url,
    sourceType: row.source_type,
    trustTier: row.trust_tier,
    language: row.language,
    scheduleCron: row.schedule_cron,
    fetchUrl: row.fetch_url,
    allowedHosts,
    maxResponseBytes: row.max_response_bytes,
    maxItemsPerPoll: row.max_items_per_poll,
    minPollIntervalSeconds: row.min_poll_interval_seconds,
    etag: row.etag,
    lastModified: row.last_modified,
    lastContentHash: row.last_content_hash,
    consecutiveFailures: row.consecutive_failures,
  };
}

export async function listRunnableSources(
  db: D1Database,
  now: Date,
  limit = 2,
): Promise<IngestionSource[]> {
  const rows = await db.prepare(`${SOURCE_SELECT}
    WHERE source.status = 'active'
      AND policy.policy_status = 'approved'
      AND policy.robots_status = 'allowed'
      AND (cursor.next_allowed_at IS NULL OR unixepoch(cursor.next_allowed_at) <= unixepoch(?))
      AND (
        cursor.last_checked_at IS NULL
        OR unixepoch(cursor.last_checked_at) + policy.min_poll_interval_seconds <= unixepoch(?)
      )
    ORDER BY COALESCE(cursor.last_checked_at, ''), source.id
    LIMIT ?
  `).bind(now.toISOString(), now.toISOString(), limit).all<SourceRow>();

  return rows.results.map(mapSource);
}

export async function getIngestionSource(
  db: D1Database,
  sourceId: string,
): Promise<IngestionSource | null> {
  const row = await db.prepare(`${SOURCE_SELECT}
    WHERE source.id = ?
      AND source.status = 'active'
      AND policy.policy_status = 'approved'
      AND policy.robots_status = 'allowed'
    LIMIT 1
  `).bind(sourceId).first<SourceRow>();
  return row ? mapSource(row) : null;
}

export async function beginFetchRun(
  db: D1Database,
  runId: string,
  sourceId: string,
  trigger: IngestionTrigger,
  idempotencyKey: string,
  requestedAt: string,
): Promise<boolean> {
  const result = await db.prepare(`
    INSERT OR IGNORE INTO source_fetch_run (
      id, source_id, trigger_type, status, idempotency_key, requested_at, started_at
    ) VALUES (?, ?, ?, 'running', ?, ?, ?)
  `).bind(runId, sourceId, trigger, idempotencyKey, requestedAt, requestedAt).run();

  return Number(result.meta.changes ?? 0) === 1;
}

interface PersistItemCounts {
  inserted: number;
  updated: number;
  duplicate: number;
}

export async function persistFeedItems(
  db: D1Database,
  source: IngestionSource,
  items: ParsedFeedItem[],
  seenAt: string,
): Promise<PersistItemCounts> {
  const counts: PersistItemCounts = { inserted: 0, updated: 0, duplicate: 0 };

  for (const item of items) {
    const existing = await db.prepare(`
      SELECT id, content_hash
      FROM source_item
      WHERE source_id = ? AND (canonical_url = ? OR external_id = ?)
      LIMIT 1
    `).bind(source.id, item.canonicalUrl, item.externalId).first<{
      id: string;
      content_hash: string;
    }>();

    if (!existing) {
      const itemId = `item_${(await sha256Hex(`${source.id}\n${item.externalId}`)).slice(0, 32)}`;
      await db.prepare(`
        INSERT INTO source_item (
          id, source_id, external_id, source_url, canonical_url, title, author,
          language, published_at, content_hash, normalized_hash,
          processing_status, summary, quality_score, quality_flags_json,
          parser_version, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normalized', ?, ?, ?, ?, ?)
      `).bind(
        itemId,
        source.id,
        item.externalId,
        item.canonicalUrl,
        item.canonicalUrl,
        item.title,
        item.author,
        item.language,
        item.publishedAt,
        item.contentHash,
        item.contentHash,
        item.summary,
        item.qualityScore,
        JSON.stringify(item.qualityFlags),
        PARSER_VERSION,
        seenAt,
      ).run();
      counts.inserted += 1;
      continue;
    }

    if (existing.content_hash === item.contentHash) {
      await db.prepare(`
        UPDATE source_item SET last_seen_at = ?, updated_at = ? WHERE id = ?
      `).bind(seenAt, seenAt, existing.id).run();
      counts.duplicate += 1;
      continue;
    }

    await db.prepare(`
      UPDATE source_item SET
        external_id = ?, source_url = ?, canonical_url = ?, title = ?, author = ?,
        language = ?, published_at = ?, content_hash = ?, normalized_hash = ?,
        summary = ?, quality_score = ?, quality_flags_json = ?, parser_version = ?,
        last_seen_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      item.externalId,
      item.canonicalUrl,
      item.canonicalUrl,
      item.title,
      item.author,
      item.language,
      item.publishedAt,
      item.contentHash,
      item.contentHash,
      item.summary,
      item.qualityScore,
      JSON.stringify(item.qualityFlags),
      PARSER_VERSION,
      seenAt,
      seenAt,
      existing.id,
    ).run();
    counts.updated += 1;
  }

  return counts;
}

interface CompletionInput {
  runId: string;
  sourceId: string;
  finishedAt: string;
  nextAllowedAt: string;
  httpStatus: number;
  responseBytes: number;
  durationMs: number;
  etag: string | null;
  lastModified: string | null;
  responseHash: string | null;
}

export async function completeNotModified(
  db: D1Database,
  input: CompletionInput,
): Promise<void> {
  await db.batch([
    db.prepare(`
      UPDATE source_cursor SET
        etag = COALESCE(?, etag),
        last_modified = COALESCE(?, last_modified),
        last_checked_at = ?, last_success_at = ?, consecutive_failures = 0,
        next_allowed_at = ?, last_http_status = ?, last_error_code = NULL,
        last_duration_ms = ?, last_content_hash = COALESCE(?, last_content_hash),
        updated_at = ?
      WHERE source_id = ? AND cursor_key = 'main'
    `).bind(
      input.etag,
      input.lastModified,
      input.finishedAt,
      input.finishedAt,
      input.nextAllowedAt,
      input.httpStatus,
      input.durationMs,
      input.responseHash,
      input.finishedAt,
      input.sourceId,
    ),
    db.prepare(`
      UPDATE source_fetch_run SET
        status = 'not_modified', finished_at = ?, http_status = ?,
        response_bytes = ?, duration_ms = ?
      WHERE id = ?
    `).bind(
      input.finishedAt,
      input.httpStatus,
      input.responseBytes,
      input.durationMs,
      input.runId,
    ),
  ]);
}

interface SuccessInput extends CompletionInput {
  cursorValue: string | null;
  itemsSeen: number;
  itemsInserted: number;
  itemsUpdated: number;
  itemsDuplicate: number;
  itemsRejected: number;
  qualityAverage: number;
  snapshotId: string;
  snapshotKey: string;
  contentType: string;
}

export async function completeSucceeded(db: D1Database, input: SuccessInput): Promise<void> {
  await db.batch([
    db.prepare(`
      INSERT INTO source_feed_snapshot (
        id, source_id, fetch_run_id, storage_key, response_hash,
        content_type, byte_size, access_policy, fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'restricted', ?)
    `).bind(
      input.snapshotId,
      input.sourceId,
      input.runId,
      input.snapshotKey,
      input.responseHash,
      input.contentType,
      input.responseBytes,
      input.finishedAt,
    ),
    db.prepare(`
      UPDATE source_cursor SET
        cursor_value = ?, etag = ?, last_modified = ?, last_checked_at = ?,
        last_success_at = ?, consecutive_failures = 0, next_allowed_at = ?,
        last_http_status = ?, last_error_code = NULL, last_duration_ms = ?,
        last_content_hash = ?, updated_at = ?
      WHERE source_id = ? AND cursor_key = 'main'
    `).bind(
      input.cursorValue,
      input.etag,
      input.lastModified,
      input.finishedAt,
      input.finishedAt,
      input.nextAllowedAt,
      input.httpStatus,
      input.durationMs,
      input.responseHash,
      input.finishedAt,
      input.sourceId,
    ),
    db.prepare(`
      UPDATE source_fetch_run SET
        status = 'succeeded', finished_at = ?, http_status = ?, response_bytes = ?,
        duration_ms = ?, items_seen = ?, items_inserted = ?, items_updated = ?,
        items_duplicate = ?, items_rejected = ?, quality_average = ?, snapshot_key = ?
      WHERE id = ?
    `).bind(
      input.finishedAt,
      input.httpStatus,
      input.responseBytes,
      input.durationMs,
      input.itemsSeen,
      input.itemsInserted,
      input.itemsUpdated,
      input.itemsDuplicate,
      input.itemsRejected,
      input.qualityAverage,
      input.snapshotKey,
      input.runId,
    ),
  ]);
}

export async function completeFailed(
  db: D1Database,
  input: {
    runId: string;
    sourceId: string;
    finishedAt: string;
    nextAllowedAt: string;
    httpStatus: number | null;
    errorCode: string;
    errorMessage: string;
  },
): Promise<void> {
  await db.batch([
    db.prepare(`
      UPDATE source_cursor SET
        last_checked_at = ?, consecutive_failures = consecutive_failures + 1,
        next_allowed_at = ?, last_http_status = ?, last_error_code = ?, updated_at = ?
      WHERE source_id = ? AND cursor_key = 'main'
    `).bind(
      input.finishedAt,
      input.nextAllowedAt,
      input.httpStatus,
      input.errorCode,
      input.finishedAt,
      input.sourceId,
    ),
    db.prepare(`
      UPDATE source_fetch_run SET
        status = 'failed', finished_at = ?, http_status = ?, error_code = ?, error_message = ?
      WHERE id = ?
    `).bind(
      input.finishedAt,
      input.httpStatus,
      input.errorCode,
      input.errorMessage.slice(0, 1000),
      input.runId,
    ),
  ]);
}

export async function listSourceHealth(db: D1Database): Promise<unknown[]> {
  const result = await db.prepare(`
    SELECT
      source.id,
      source.name,
      source.source_type AS sourceType,
      source.trust_tier AS trustTier,
      source.status,
      source.schedule_cron AS scheduleCron,
      policy.fetch_url AS fetchUrl,
      policy.policy_status AS policyStatus,
      policy.robots_status AS robotsStatus,
      policy.allow_html_fetch AS allowHtmlFetch,
      policy.min_poll_interval_seconds AS minPollIntervalSeconds,
      cursor.last_checked_at AS lastCheckedAt,
      cursor.last_success_at AS lastSuccessAt,
      cursor.consecutive_failures AS consecutiveFailures,
      cursor.next_allowed_at AS nextAllowedAt,
      cursor.last_http_status AS lastHttpStatus,
      cursor.last_error_code AS lastErrorCode,
      cursor.last_duration_ms AS lastDurationMs,
      (
        SELECT run.quality_average FROM source_fetch_run AS run
        WHERE run.source_id = source.id AND run.status = 'succeeded'
        ORDER BY run.started_at DESC LIMIT 1
      ) AS latestQualityAverage
    FROM news_source AS source
    JOIN source_ingestion_policy AS policy ON policy.source_id = source.id
    JOIN source_cursor AS cursor ON cursor.source_id = source.id AND cursor.cursor_key = 'main'
    ORDER BY source.id
  `).all();
  return result.results;
}

export interface IngestionHealth {
  activeSources: number;
  successfulRuns24h: number;
  failedRuns24h: number;
  itemsInserted24h: number;
  averageQuality24h: number | null;
}

export async function getIngestionHealth(db: D1Database): Promise<IngestionHealth> {
  const result = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM news_source WHERE status = 'active') AS active_sources,
      SUM(CASE WHEN status IN ('succeeded', 'not_modified') THEN 1 ELSE 0 END) AS successful_runs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
      SUM(items_inserted) AS items_inserted,
      AVG(CASE WHEN status = 'succeeded' THEN quality_average END) AS average_quality
    FROM source_fetch_run
    WHERE started_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')
  `).first<{
    active_sources: number;
    successful_runs: number | null;
    failed_runs: number | null;
    items_inserted: number | null;
    average_quality: number | null;
  }>();

  return {
    activeSources: Number(result?.active_sources ?? 0),
    successfulRuns24h: Number(result?.successful_runs ?? 0),
    failedRuns24h: Number(result?.failed_runs ?? 0),
    itemsInserted24h: Number(result?.items_inserted ?? 0),
    averageQuality24h: result?.average_quality === null || result?.average_quality === undefined
      ? null
      : Math.round(Number(result.average_quality) * 10) / 10,
  };
}
