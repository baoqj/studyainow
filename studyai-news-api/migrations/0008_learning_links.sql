PRAGMA foreign_keys = ON;

CREATE TABLE core_catalog_sync (
  id TEXT PRIMARY KEY,
  contract_version TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  catalog_checksum TEXT NOT NULL,
  skill_count INTEGER NOT NULL CHECK (skill_count >= 0),
  course_count INTEGER NOT NULL CHECK (course_count >= 0),
  retrieval_version TEXT NOT NULL,
  embedding_version TEXT NOT NULL,
  vector_status TEXT NOT NULL CHECK (vector_status IN ('indexed', 'degraded')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (catalog_version, catalog_checksum, vector_status)
) STRICT;

CREATE INDEX idx_core_catalog_sync_created
  ON core_catalog_sync (created_at DESC);

CREATE TABLE learning_link_run (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE RESTRICT,
  catalog_sync_id TEXT NOT NULL REFERENCES core_catalog_sync(id) ON DELETE RESTRICT,
  query_hash TEXT NOT NULL,
  retrieval_version TEXT NOT NULL,
  embedding_version TEXT NOT NULL,
  candidate_count INTEGER NOT NULL CHECK (candidate_count >= 0),
  suggestion_count INTEGER NOT NULL CHECK (suggestion_count >= 0),
  vector_status TEXT NOT NULL CHECK (vector_status IN ('indexed', 'degraded')),
  actor_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (story_id, catalog_sync_id, query_hash)
) STRICT;

CREATE INDEX idx_learning_link_run_story_created
  ON learning_link_run (story_id, created_at DESC);

CREATE TABLE story_learning_link (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL CHECK (object_type IN ('skill', 'course')),
  core_object_id TEXT NOT NULL,
  core_slug TEXT NOT NULL,
  core_title TEXT NOT NULL,
  core_url TEXT NOT NULL,
  relevance_score REAL NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
  keyword_score REAL NOT NULL CHECK (keyword_score BETWEEN 0 AND 1),
  vector_score REAL NOT NULL CHECK (vector_score BETWEEN 0 AND 1),
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('introduced', 'changed', 'applied', 'required', 'learn_next', 'practice', 'background')
  ),
  impact_type TEXT NOT NULL CHECK (impact_type IN ('learn', 'practice', 'adopt', 'monitor', 'replace')),
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) BETWEEN 1 AND 2000),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  catalog_version TEXT NOT NULL,
  catalog_checksum TEXT NOT NULL,
  retrieval_version TEXT NOT NULL,
  embedding_version TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (review_status IN ('suggested', 'approved', 'rejected', 'withdrawn', 'stale')),
  reviewer_ref TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (story_id, object_type, core_object_id)
) STRICT;

CREATE INDEX idx_story_learning_link_review
  ON story_learning_link (review_status, relevance_score DESC, updated_at DESC);

CREATE INDEX idx_story_learning_link_story
  ON story_learning_link (story_id, object_type, relevance_score DESC);

CREATE TABLE learning_link_revision (
  id TEXT PRIMARY KEY,
  learning_link_id TEXT NOT NULL REFERENCES story_learning_link(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  review_status TEXT NOT NULL
    CHECK (review_status IN ('suggested', 'approved', 'rejected', 'withdrawn', 'stale')),
  relevance_score REAL NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
  catalog_version TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (learning_link_id, revision_number)
) STRICT;

CREATE INDEX idx_learning_link_revision_link_created
  ON learning_link_revision (learning_link_id, created_at DESC);

CREATE TRIGGER core_catalog_sync_immutable_update
BEFORE UPDATE ON core_catalog_sync
BEGIN
  SELECT RAISE(ABORT, 'core catalog sync records are immutable');
END;

CREATE TRIGGER core_catalog_sync_immutable_delete
BEFORE DELETE ON core_catalog_sync
BEGIN
  SELECT RAISE(ABORT, 'core catalog sync records are immutable');
END;

CREATE TRIGGER learning_link_run_immutable_update
BEFORE UPDATE ON learning_link_run
BEGIN
  SELECT RAISE(ABORT, 'learning link runs are immutable');
END;

CREATE TRIGGER learning_link_run_immutable_delete
BEFORE DELETE ON learning_link_run
BEGIN
  SELECT RAISE(ABORT, 'learning link runs are immutable');
END;

CREATE TRIGGER learning_link_revision_immutable_update
BEFORE UPDATE ON learning_link_revision
BEGIN
  SELECT RAISE(ABORT, 'learning link revisions are immutable');
END;

CREATE TRIGGER learning_link_revision_immutable_delete
BEFORE DELETE ON learning_link_revision
BEGIN
  SELECT RAISE(ABORT, 'learning link revisions are immutable');
END;

UPDATE schema_metadata
SET value = '8', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'news_schema_version';
