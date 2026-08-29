-- Keep source acquisition, private semantic analysis, public display, and
-- vector matching as separate concerns. A metadata-only source can therefore
-- be analysed without publishing the employer's full job description.
ALTER TABLE job_sections ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'analysis_only'));

ALTER TABLE job_postings ADD COLUMN source_updated_at TEXT;
ALTER TABLE job_postings ADD COLUMN first_collected_at TEXT;
ALTER TABLE job_postings ADD COLUMN last_seen_at TEXT;

UPDATE job_postings
SET first_collected_at = strftime(
      '%Y-%m-%dT%H:%M:%SZ',
      COALESCE(NULLIF(TRIM(created_at), ''), NULLIF(TRIM(captured_at), ''), NULLIF(TRIM(collected_at), ''), CURRENT_TIMESTAMP)
    ),
    last_seen_at = strftime(
      '%Y-%m-%dT%H:%M:%SZ',
      COALESCE(NULLIF(TRIM(collected_at), ''), NULLIF(TRIM(last_verified_at), ''), NULLIF(TRIM(captured_at), ''), CURRENT_TIMESTAMP)
    )
WHERE first_collected_at IS NULL OR last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS job_sections_visibility_idx
  ON job_sections(job_id, version_id, visibility, order_index);
CREATE INDEX IF NOT EXISTS job_postings_collection_dates_idx
  ON job_postings(status, first_collected_at DESC, last_seen_at DESC);

-- Tags are deliberately versioned. Source-provided tags and model-extracted
-- skills/knowledge share one normalized shape while retaining their origin.
CREATE TABLE IF NOT EXISTS job_tags (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  tag_key TEXT NOT NULL,
  label TEXT NOT NULL,
  tag_type TEXT NOT NULL CHECK (tag_type IN (
    'department', 'team', 'employment', 'workplace', 'role', 'domain',
    'technology', 'tool', 'method', 'knowledge', 'skill', 'source'
  )),
  language TEXT NOT NULL DEFAULT 'und',
  source_method TEXT NOT NULL CHECK (source_method IN ('source_metadata', 'dictionary_rule', 'llm_analysis')),
  confidence REAL NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rejected', 'stale')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (version_id, tag_type, tag_key, source_method),
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES job_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_tags_job_version_idx
  ON job_tags(job_id, version_id, status, confidence DESC);
CREATE INDEX IF NOT EXISTS job_tags_key_idx
  ON job_tags(tag_key, tag_type, status);

-- One vector per logical job is updated when a new version becomes current.
-- The D1 row is the durable retry/audit record; the embedding itself lives in
-- Cloudflare Vectorize under vector_id (the stable job id).
CREATE TABLE IF NOT EXISTS job_vector_records (
  id TEXT PRIMARY KEY,
  vector_id TEXT NOT NULL UNIQUE,
  job_id TEXT NOT NULL UNIQUE,
  version_id TEXT NOT NULL,
  semantic_hash TEXT NOT NULL,
  content_hash TEXT,
  embedding_model TEXT NOT NULL DEFAULT '@cf/baai/bge-m3',
  dimensions INTEGER NOT NULL DEFAULT 1024,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'indexed', 'error', 'stale')),
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  next_attempt_at TEXT,
  mutation_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  last_error TEXT,
  indexed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES job_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_vector_records_queue_idx
  ON job_vector_records(status, next_attempt_at, locked_until, updated_at);
CREATE INDEX IF NOT EXISTS job_vector_records_version_idx
  ON job_vector_records(version_id, semantic_hash);

-- Preserve useful skills from analyses completed before keyword/tag storage
-- existed. Pending candidates stay non-public graph suggestions, but their
-- normalized labels remain usable as internal matching metadata.
INSERT OR IGNORE INTO job_tags
  (id, job_id, version_id, tag_key, label, tag_type, language, source_method, confidence, status)
SELECT lower(hex(randomblob(16))), job_versions.job_id, skill_candidates.source_id,
       skill_candidates.proposed_slug,
       COALESCE(NULLIF(TRIM(skill_candidates.name_en), ''), skill_candidates.proposed_slug),
       'skill', 'und', 'llm_analysis', skill_candidates.confidence, 'active'
FROM skill_candidates
JOIN job_versions ON job_versions.id = skill_candidates.source_id
WHERE skill_candidates.source_type = 'job_version'
  AND skill_candidates.status IN ('pending', 'approved');

-- Existing current jobs already completed the reviewed semantic-analysis
-- queue. Seed their durable vector work so the unchanged two-minute graph
-- worker can backfill them in bounded batches.
INSERT OR IGNORE INTO job_vector_records
  (id, vector_id, job_id, version_id, semantic_hash, status, next_attempt_at)
SELECT job_postings.id, job_postings.id, job_postings.id, job_versions.id,
       job_versions.semantic_hash, 'pending', CURRENT_TIMESTAMP
FROM job_postings
JOIN job_versions ON job_versions.id = job_postings.current_version_id
WHERE job_postings.status = 'published'
  AND EXISTS (
    SELECT 1 FROM knowledge_refresh_queue
    WHERE knowledge_refresh_queue.source_type = 'job_version'
      AND knowledge_refresh_queue.source_id = job_versions.id
      AND knowledge_refresh_queue.source_hash = job_versions.semantic_hash
      AND knowledge_refresh_queue.status = 'completed'
  );
