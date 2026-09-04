PRAGMA foreign_keys = ON;

ALTER TABLE source_cursor ADD COLUMN next_allowed_at TEXT;
ALTER TABLE source_cursor ADD COLUMN last_http_status INTEGER
  CHECK (last_http_status IS NULL OR last_http_status BETWEEN 100 AND 599);
ALTER TABLE source_cursor ADD COLUMN last_error_code TEXT;
ALTER TABLE source_cursor ADD COLUMN last_duration_ms INTEGER
  CHECK (last_duration_ms IS NULL OR last_duration_ms >= 0);
ALTER TABLE source_cursor ADD COLUMN last_content_hash TEXT;

ALTER TABLE source_item ADD COLUMN summary TEXT
  CHECK (summary IS NULL OR length(summary) <= 2000);
ALTER TABLE source_item ADD COLUMN quality_score INTEGER
  CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100);
ALTER TABLE source_item ADD COLUMN quality_flags_json TEXT
  CHECK (quality_flags_json IS NULL OR json_valid(quality_flags_json));
ALTER TABLE source_item ADD COLUMN parser_version TEXT;
ALTER TABLE source_item ADD COLUMN last_seen_at TEXT;

CREATE TABLE source_ingestion_policy (
  source_id TEXT PRIMARY KEY REFERENCES news_source(id) ON DELETE RESTRICT,
  fetch_url TEXT NOT NULL UNIQUE,
  allowed_hosts_json TEXT NOT NULL CHECK (json_valid(allowed_hosts_json)),
  policy_status TEXT NOT NULL DEFAULT 'review_required'
    CHECK (policy_status IN ('review_required', 'approved', 'blocked')),
  robots_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (robots_status IN ('unknown', 'allowed', 'disallowed', 'error')),
  allow_html_fetch INTEGER NOT NULL DEFAULT 0 CHECK (allow_html_fetch IN (0, 1)),
  max_response_bytes INTEGER NOT NULL DEFAULT 1048576
    CHECK (max_response_bytes BETWEEN 1024 AND 1048576),
  max_items_per_poll INTEGER NOT NULL DEFAULT 20
    CHECK (max_items_per_poll BETWEEN 1 AND 100),
  min_poll_interval_seconds INTEGER NOT NULL DEFAULT 3600
    CHECK (min_poll_interval_seconds BETWEEN 900 AND 86400),
  retention_policy TEXT NOT NULL DEFAULT 'private_feed_snapshot'
    CHECK (retention_policy IN ('metadata_only', 'private_feed_snapshot')),
  policy_reviewed_at TEXT,
  next_policy_review_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (policy_status <> 'approved' OR robots_status = 'allowed'),
  CHECK (policy_status <> 'approved' OR policy_reviewed_at IS NOT NULL)
) STRICT;

CREATE INDEX idx_source_ingestion_policy_status
  ON source_ingestion_policy (policy_status, robots_status, min_poll_interval_seconds);

CREATE TABLE source_fetch_run (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES news_source(id) ON DELETE RESTRICT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'not_modified', 'failed', 'skipped')),
  attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  idempotency_key TEXT NOT NULL UNIQUE,
  requested_at TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  http_status INTEGER CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  response_bytes INTEGER CHECK (response_bytes IS NULL OR response_bytes >= 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  items_seen INTEGER NOT NULL DEFAULT 0 CHECK (items_seen >= 0),
  items_inserted INTEGER NOT NULL DEFAULT 0 CHECK (items_inserted >= 0),
  items_updated INTEGER NOT NULL DEFAULT 0 CHECK (items_updated >= 0),
  items_duplicate INTEGER NOT NULL DEFAULT 0 CHECK (items_duplicate >= 0),
  items_rejected INTEGER NOT NULL DEFAULT 0 CHECK (items_rejected >= 0),
  quality_average REAL CHECK (quality_average IS NULL OR quality_average BETWEEN 0 AND 100),
  snapshot_key TEXT,
  error_code TEXT,
  error_message TEXT CHECK (error_message IS NULL OR length(error_message) <= 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_source_fetch_run_source_started
  ON source_fetch_run (source_id, started_at DESC);

CREATE INDEX idx_source_fetch_run_status_started
  ON source_fetch_run (status, started_at DESC);

CREATE TABLE source_feed_snapshot (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES news_source(id) ON DELETE RESTRICT,
  fetch_run_id TEXT NOT NULL UNIQUE REFERENCES source_fetch_run(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL UNIQUE,
  response_hash TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  access_policy TEXT NOT NULL DEFAULT 'restricted'
    CHECK (access_policy = 'restricted'),
  fetched_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (source_id, response_hash)
) STRICT;

CREATE INDEX idx_source_feed_snapshot_source_fetched
  ON source_feed_snapshot (source_id, fetched_at DESC);

CREATE TRIGGER source_feed_snapshot_immutable_update
BEFORE UPDATE ON source_feed_snapshot
BEGIN
  SELECT RAISE(ABORT, 'source feed snapshots are immutable');
END;

CREATE TRIGGER source_feed_snapshot_immutable_delete
BEFORE DELETE ON source_feed_snapshot
BEGIN
  SELECT RAISE(ABORT, 'source feed snapshots are immutable');
END;

UPDATE schema_metadata
SET value = '3', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'news_schema_version';
