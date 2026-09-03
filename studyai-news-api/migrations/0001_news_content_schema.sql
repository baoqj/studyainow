PRAGMA foreign_keys = ON;

CREATE TABLE schema_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

INSERT INTO schema_metadata (key, value) VALUES ('news_schema_version', '1');

CREATE TABLE news_source (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'atom', 'api', 'web', 'manual')),
  trust_tier TEXT NOT NULL CHECK (trust_tier IN ('A', 'B', 'C', 'D')),
  language TEXT NOT NULL,
  schedule_cron TEXT,
  parser_key TEXT,
  terms_note TEXT,
  full_text_authorized INTEGER NOT NULL DEFAULT 0 CHECK (full_text_authorized IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (base_url, source_type)
) STRICT;

CREATE INDEX idx_news_source_status_schedule
  ON news_source (status, schedule_cron);

CREATE TABLE source_cursor (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES news_source(id) ON DELETE CASCADE,
  cursor_key TEXT NOT NULL DEFAULT 'main',
  cursor_value TEXT,
  etag TEXT,
  last_modified TEXT,
  last_checked_at TEXT,
  last_success_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (source_id, cursor_key)
) STRICT;

CREATE TABLE source_item (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES news_source(id) ON DELETE RESTRICT,
  external_id TEXT,
  source_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  language TEXT NOT NULL,
  published_at TEXT,
  event_at TEXT,
  content_hash TEXT NOT NULL,
  normalized_hash TEXT,
  processing_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (processing_status IN ('discovered', 'fetched', 'normalized', 'clustered', 'failed')),
  error_code TEXT,
  discovered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (source_id, canonical_url),
  UNIQUE (source_id, external_id)
) STRICT;

CREATE INDEX idx_source_item_status_discovered
  ON source_item (processing_status, discovered_at);

CREATE INDEX idx_source_item_published
  ON source_item (published_at DESC);

CREATE INDEX idx_source_item_content_hash
  ON source_item (content_hash);

CREATE TABLE source_snapshot (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES source_item(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  response_hash TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  content_type TEXT,
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
  http_status INTEGER CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  access_policy TEXT NOT NULL
    CHECK (access_policy IN ('restricted', 'metadata_only', 'redistributable')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (item_id, response_hash),
  UNIQUE (storage_key)
) STRICT;

CREATE INDEX idx_source_snapshot_item_fetched
  ON source_snapshot (item_id, fetched_at DESC);

CREATE TABLE story_cluster (
  id TEXT PRIMARY KEY,
  canonical_title TEXT NOT NULL,
  occurred_at TEXT,
  status TEXT NOT NULL DEFAULT 'clustered'
    CHECK (status IN ('clustered', 'enriched', 'drafted', 'failed', 'archived')),
  novelty_score REAL CHECK (novelty_score IS NULL OR novelty_score BETWEEN 0 AND 1),
  duplicate_key TEXT,
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (duplicate_key)
) STRICT;

CREATE INDEX idx_story_cluster_status_occurred
  ON story_cluster (status, occurred_at DESC);

CREATE TABLE story_source (
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES source_item(id) ON DELETE RESTRICT,
  relation_type TEXT NOT NULL
    CHECK (relation_type IN ('primary', 'supporting', 'conflicting', 'duplicate')),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (story_id, item_id)
) STRICT;

CREATE INDEX idx_story_source_item
  ON story_source (item_id);

CREATE TABLE claim (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL
    CHECK (claim_type IN ('fact', 'number', 'quote', 'prediction', 'editorial_opinion', 'inference')),
  support_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (support_status IN ('supported', 'conflicted', 'unverified', 'rejected')),
  risk_level TEXT NOT NULL DEFAULT 'normal' CHECK (risk_level IN ('normal', 'high')),
  checked_at TEXT,
  reviewer_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_claim_story_support
  ON claim (story_id, support_status);

CREATE TABLE claim_evidence (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES source_item(id) ON DELETE RESTRICT,
  source_url TEXT NOT NULL,
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 2000),
  location_json TEXT CHECK (location_json IS NULL OR json_valid(location_json)),
  source_tier TEXT NOT NULL CHECK (source_tier IN ('A', 'B', 'C', 'D')),
  evidence_hash TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (claim_id, item_id, evidence_hash)
) STRICT;

CREATE INDEX idx_claim_evidence_item
  ON claim_evidence (item_id);

CREATE TABLE article (
  id TEXT PRIMARY KEY,
  story_id TEXT REFERENCES story_cluster(id) ON DELETE SET NULL,
  article_type TEXT NOT NULL CHECK (article_type IN ('brief', 'deep_dive', 'daily', 'podcast_notes')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'scheduled', 'published', 'rejected', 'corrected', 'distributed', 'withdrawn')),
  access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'member', 'vip', 'internal')),
  primary_locale TEXT NOT NULL DEFAULT 'zh-CN',
  active_revision_id TEXT REFERENCES article_revision(id) ON DELETE RESTRICT,
  published_revision_id TEXT REFERENCES article_revision(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  scheduled_at TEXT,
  published_at TEXT,
  corrected_at TEXT,
  withdrawn_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
) STRICT;

CREATE INDEX idx_article_status_schedule
  ON article (status, scheduled_at);

CREATE INDEX idx_article_story
  ON article (story_id);

CREATE TABLE article_locale (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  seo_json TEXT CHECK (seo_json IS NULL OR json_valid(seo_json)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'withdrawn')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (article_id, locale),
  UNIQUE (locale, slug)
) STRICT;

CREATE TABLE article_revision (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  editor_ref TEXT NOT NULL,
  source_input_hash TEXT,
  model_run_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (article_id, locale, revision_number),
  UNIQUE (id, article_id)
) STRICT;

CREATE INDEX idx_article_revision_article_created
  ON article_revision (article_id, created_at DESC);

CREATE TABLE article_approval (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES article_revision(id) ON DELETE RESTRICT,
  actor_ref TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('editor', 'publisher', 'admin')),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  checklist_json TEXT CHECK (checklist_json IS NULL OR json_valid(checklist_json)),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (revision_id, actor_ref)
) STRICT;

CREATE INDEX idx_article_approval_revision_decision
  ON article_approval (revision_id, decision, actor_role);

CREATE TABLE article_claim (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL,
  claim_id TEXT NOT NULL REFERENCES claim(id) ON DELETE RESTRICT,
  block_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (revision_id, claim_id, block_id),
  FOREIGN KEY (revision_id, article_id) REFERENCES article_revision(id, article_id) ON DELETE RESTRICT
) STRICT;

CREATE INDEX idx_article_claim_article
  ON article_claim (article_id);

CREATE TABLE taxonomy_node (
  id TEXT PRIMARY KEY,
  taxonomy_type TEXT NOT NULL CHECK (taxonomy_type IN ('category', 'tag', 'keyword')),
  parent_id TEXT REFERENCES taxonomy_node(id) ON DELETE RESTRICT,
  canonical_id TEXT REFERENCES taxonomy_node(id) ON DELETE RESTRICT,
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(aliases_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'retired')),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (taxonomy_type, locale, slug),
  CHECK (id <> parent_id),
  CHECK (id <> canonical_id)
) STRICT;

CREATE INDEX idx_taxonomy_node_parent
  ON taxonomy_node (parent_id);

CREATE TABLE article_taxonomy (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  taxonomy_id TEXT NOT NULL REFERENCES taxonomy_node(id) ON DELETE RESTRICT,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('primary', 'secondary', 'mentioned')),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  source_version TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (article_id, taxonomy_id, relation_type)
) STRICT;

CREATE TABLE entity (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization', 'product', 'model', 'technology', 'location', 'other')),
  canonical_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(aliases_json)),
  external_refs_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(external_refs_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'retired')),
  canonical_id TEXT REFERENCES entity(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (id <> canonical_id)
) STRICT;

CREATE INDEX idx_entity_type_name
  ON entity (entity_type, canonical_name);

CREATE TABLE article_entity (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entity(id) ON DELETE RESTRICT,
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 2000),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (article_id, entity_id)
) STRICT;

CREATE TABLE article_skill_link (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('introduced', 'changed', 'applied', 'deprecated', 'required')),
  relevance_score REAL NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
  impact_type TEXT NOT NULL CHECK (impact_type IN ('learn', 'practice', 'adopt', 'monitor', 'replace')),
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 2000),
  retrieval_version TEXT,
  model_version TEXT,
  prompt_version TEXT,
  review_status TEXT NOT NULL DEFAULT 'suggested' CHECK (review_status IN ('suggested', 'approved', 'rejected')),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  reviewer_ref TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (article_id, skill_id, relationship_type)
) STRICT;

CREATE INDEX idx_article_skill_link_review
  ON article_skill_link (review_status, relevance_score DESC);

CREATE TABLE article_knowledge_link (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  knowledge_point_id TEXT NOT NULL,
  relevance_score REAL NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
  change_summary TEXT NOT NULL,
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 2000),
  review_status TEXT NOT NULL DEFAULT 'suggested' CHECK (review_status IN ('suggested', 'approved', 'rejected')),
  source_version TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (article_id, knowledge_point_id)
) STRICT;

CREATE TABLE article_course_link (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  chapter_id TEXT,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('learn_next', 'practice', 'background', 'update_needed')),
  reason TEXT NOT NULL,
  evidence_excerpt TEXT CHECK (evidence_excerpt IS NULL OR length(evidence_excerpt) <= 2000),
  review_status TEXT NOT NULL DEFAULT 'suggested' CHECK (review_status IN ('suggested', 'approved', 'rejected')),
  source_version TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (article_id, course_id, relation_type)
) STRICT;

CREATE TABLE skill_candidate (
  id TEXT PRIMARY KEY,
  proposed_name TEXT NOT NULL,
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 2000),
  nearest_skill_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(nearest_skill_ids_json)),
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved_for_core_review', 'mapped', 'rejected')),
  mapped_skill_id TEXT,
  model_version TEXT,
  prompt_version TEXT,
  reviewer_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE embedding_manifest (
  id TEXT PRIMARY KEY,
  object_type TEXT NOT NULL CHECK (object_type IN ('source_item', 'story_cluster', 'article_revision', 'skill_candidate')),
  object_id TEXT NOT NULL,
  index_id TEXT NOT NULL,
  embedding_version TEXT NOT NULL,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (object_type, object_id, index_id, embedding_version)
) STRICT;

CREATE INDEX idx_embedding_manifest_object
  ON embedding_manifest (object_type, object_id, status);

CREATE TABLE workflow_run (
  id TEXT PRIMARY KEY,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('ingest', 'enrichment', 'research', 'generation', 'publication', 'media', 'distribution')),
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  current_step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'waiting_for_human', 'succeeded', 'failed', 'cancelled')),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  idempotency_key TEXT NOT NULL UNIQUE,
  model_version TEXT,
  prompt_version TEXT,
  input_hash TEXT,
  token_input INTEGER NOT NULL DEFAULT 0 CHECK (token_input >= 0),
  token_output INTEGER NOT NULL DEFAULT 0 CHECK (token_output >= 0),
  cost_micros INTEGER NOT NULL DEFAULT 0 CHECK (cost_micros >= 0),
  error_code TEXT,
  error_message TEXT,
  approval_ref TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_workflow_run_status_created
  ON workflow_run (status, created_at);

CREATE INDEX idx_workflow_run_object
  ON workflow_run (object_type, object_id, created_at DESC);

CREATE TABLE workflow_step_attempt (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_run(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'cancelled')),
  input_hash TEXT,
  output_ref TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (workflow_run_id, step_key, attempt_number)
) STRICT;

CREATE TABLE idempotency_record (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'succeeded', 'failed')),
  response_code INTEGER CHECK (response_code IS NULL OR response_code BETWEEN 100 AND 599),
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  object_type TEXT,
  object_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (scope, idempotency_key)
) STRICT;

CREATE INDEX idx_idempotency_record_expires
  ON idempotency_record (expires_at);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_ref TEXT NOT NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  reason TEXT,
  trace_id TEXT NOT NULL,
  idempotency_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_audit_log_object_created
  ON audit_log (object_type, object_id, created_at DESC);

CREATE INDEX idx_audit_log_actor_created
  ON audit_log (actor_ref, created_at DESC);

CREATE TABLE article_publication_event (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE RESTRICT,
  revision_id TEXT NOT NULL REFERENCES article_revision(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('scheduled', 'published', 'corrected', 'withdrawn', 'redistributed', 'retry_requested')),
  actor_ref TEXT NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  trace_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_publication_event_article_created
  ON article_publication_event (article_id, created_at DESC);

CREATE TABLE media_asset (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('source_snapshot', 'article', 'podcast_episode', 'workflow_run')),
  owner_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('snapshot', 'cover', 'audio_segment', 'audio_master', 'transcript', 'export')),
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  checksum TEXT NOT NULL,
  rights_status TEXT NOT NULL CHECK (rights_status IN ('owned', 'licensed', 'source_restricted', 'public_domain', 'unknown')),
  source_url TEXT,
  access_policy TEXT NOT NULL CHECK (access_policy IN ('private', 'signed', 'public')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed', 'retired')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_media_asset_owner
  ON media_asset (owner_type, owner_id, status);

CREATE TABLE podcast_episode (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE RESTRICT,
  locale TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'script_review', 'audio_processing', 'ready', 'published', 'withdrawn', 'failed')),
  access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'member', 'vip')),
  audio_asset_id TEXT REFERENCES media_asset(id) ON DELETE RESTRICT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  rss_guid TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (locale, slug),
  UNIQUE (rss_guid)
) STRICT;

CREATE INDEX idx_podcast_episode_status_published
  ON podcast_episode (status, published_at DESC);

CREATE TABLE podcast_script (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES podcast_episode(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  segments_json TEXT NOT NULL CHECK (json_valid(segments_json)),
  pronunciation_version TEXT,
  editor_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (episode_id, revision_number)
) STRICT;

CREATE TABLE episode_chapter (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES podcast_episode(id) ON DELETE CASCADE,
  start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
  title TEXT NOT NULL,
  article_block_id TEXT,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  UNIQUE (episode_id, sort_order),
  UNIQUE (episode_id, start_ms)
) STRICT;

CREATE TABLE transcript_segment (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES podcast_episode(id) ON DELETE CASCADE,
  start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
  end_ms INTEGER NOT NULL CHECK (end_ms > start_ms),
  speaker TEXT NOT NULL,
  transcript_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  UNIQUE (episode_id, sort_order)
) STRICT;

CREATE INDEX idx_transcript_segment_episode_time
  ON transcript_segment (episode_id, start_ms);
