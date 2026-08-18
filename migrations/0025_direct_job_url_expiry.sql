-- Job validity is determined by the original, individual posting URL. A source
-- catalogue is never negative evidence because official boards paginate and
-- reorder their results.
ALTER TABLE job_postings ADD COLUMN original_source_url TEXT;
ALTER TABLE job_postings ADD COLUMN collected_at TEXT;
ALTER TABLE job_postings ADD COLUMN suspected_expired_at TEXT;
ALTER TABLE job_postings ADD COLUMN last_url_checked_at TEXT;
ALTER TABLE job_postings ADD COLUMN url_check_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (url_check_status IN ('pending', 'active', 'missing', 'inconclusive', 'error'));
ALTER TABLE job_postings ADD COLUMN url_check_http_status INTEGER;
ALTER TABLE job_postings ADD COLUMN url_check_error TEXT;

CREATE TABLE IF NOT EXISTS job_url_inspections (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_url TEXT NOT NULL,
  final_url TEXT,
  http_status INTEGER,
  outcome TEXT NOT NULL CHECK (outcome IN ('active', 'missing', 'inconclusive', 'error')),
  detail TEXT,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_postings_url_inspection_due_idx
  ON job_postings(status, last_url_checked_at, suspected_expired_at);
CREATE INDEX IF NOT EXISTS job_url_inspections_job_checked_idx
  ON job_url_inspections(job_id, checked_at DESC);

-- Establish one immutable original URL and publication date for every existing
-- role. All legacy lifecycle states are reset as valid before the first direct
-- URL inspection establishes fresh evidence.
INSERT INTO job_status_events (id, job_id, from_status, to_status, reason)
SELECT lower(hex(randomblob(16))), id, status, 'published',
       'Lifecycle reset: validity will be determined by direct original source URL inspection.'
FROM job_postings
WHERE status <> 'published';

UPDATE job_postings
SET original_source_url = COALESCE(NULLIF(TRIM(original_source_url), ''), source_url),
    source_published_at = COALESCE(
      NULLIF(TRIM(source_published_at), ''),
      captured_at,
      created_at,
      strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    ),
    collected_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
    suspected_expired_at = strftime(
      '%Y-%m-%dT%H:%M:%SZ',
      CASE WHEN datetime(COALESCE(NULLIF(TRIM(source_published_at), ''), captured_at, created_at, CURRENT_TIMESTAMP), '+90 days')
                > datetime('now', '+30 days')
           THEN datetime(COALESCE(NULLIF(TRIM(source_published_at), ''), captured_at, created_at, CURRENT_TIMESTAMP), '+90 days')
           ELSE datetime('now', '+30 days')
      END
    ),
    last_url_checked_at = NULL,
    url_check_status = 'pending',
    url_check_http_status = NULL,
    url_check_error = NULL,
    expires_at = NULL,
    missing_run_count = 0,
    status = 'published',
    updated_at = CURRENT_TIMESTAMP;
