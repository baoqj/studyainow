PRAGMA foreign_keys = ON;

ALTER TABLE claim ADD COLUMN importance TEXT NOT NULL DEFAULT 'standard'
  CHECK (importance IN ('critical', 'standard'));
ALTER TABLE claim ADD COLUMN locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1));
ALTER TABLE claim ADD COLUMN source_input_hash TEXT;

CREATE TABLE research_package (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version >= 1),
  status TEXT NOT NULL CHECK (status IN ('ready', 'needs_review')),
  source_count INTEGER NOT NULL CHECK (source_count >= 0),
  claim_count INTEGER NOT NULL CHECK (claim_count >= 0),
  conflict_count INTEGER NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
  timeline_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(timeline_json)),
  source_summary_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_summary_json)),
  input_hash TEXT NOT NULL,
  generator_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (story_id, version),
  UNIQUE (story_id, input_hash)
) STRICT;

CREATE INDEX idx_research_package_story_created
  ON research_package (story_id, created_at DESC);

CREATE TABLE research_package_source (
  package_id TEXT NOT NULL REFERENCES research_package(id) ON DELETE RESTRICT,
  item_id TEXT NOT NULL REFERENCES source_item(id) ON DELETE RESTRICT,
  source_url TEXT NOT NULL,
  source_tier TEXT NOT NULL CHECK (source_tier IN ('A', 'B', 'C', 'D')),
  relation_type TEXT NOT NULL CHECK (relation_type IN ('primary', 'supporting', 'conflicting', 'duplicate')),
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 2000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (package_id, item_id)
) STRICT;

CREATE TABLE prompt_registry (
  id TEXT PRIMARY KEY,
  task_key TEXT NOT NULL,
  version TEXT NOT NULL,
  file_ref TEXT NOT NULL,
  template_hash TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'retired')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (task_key, version)
) STRICT;

INSERT INTO prompt_registry (
  id, task_key, version, file_ref, template_hash, schema_version, status
) VALUES (
  'prompt:claim-research:source-bound-v1',
  'claim_research',
  'source-bound-v1',
  'src/research/prompts.ts',
  'deterministic-source-bound-v1',
  'claim-ledger-v1',
  'active'
);

CREATE TABLE claim_revision (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claim(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL
    CHECK (claim_type IN ('fact', 'number', 'quote', 'prediction', 'editorial_opinion', 'inference')),
  support_status TEXT NOT NULL
    CHECK (support_status IN ('supported', 'conflicted', 'unverified', 'rejected')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('normal', 'high')),
  importance TEXT NOT NULL CHECK (importance IN ('critical', 'standard')),
  reviewer_ref TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (claim_id, revision_number)
) STRICT;

CREATE INDEX idx_claim_revision_claim_created
  ON claim_revision (claim_id, created_at DESC);

CREATE TABLE article_fact_check (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE RESTRICT,
  revision_id TEXT NOT NULL REFERENCES article_revision(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  factual_claims INTEGER NOT NULL CHECK (factual_claims >= 0),
  supported_factual_claims INTEGER NOT NULL CHECK (supported_factual_claims >= 0),
  critical_claims INTEGER NOT NULL CHECK (critical_claims >= 0),
  supported_critical_claims INTEGER NOT NULL CHECK (supported_critical_claims >= 0),
  coverage_percent REAL NOT NULL CHECK (coverage_percent BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK (status IN ('passed', 'blocked')),
  checker_ref TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json)),
  checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_article_fact_check_revision_checked
  ON article_fact_check (revision_id, checked_at DESC);

CREATE TRIGGER research_package_immutable_update
BEFORE UPDATE ON research_package
BEGIN
  SELECT RAISE(ABORT, 'research packages are immutable');
END;

CREATE TRIGGER research_package_immutable_delete
BEFORE DELETE ON research_package
BEGIN
  SELECT RAISE(ABORT, 'research packages are immutable');
END;

CREATE TRIGGER research_package_source_immutable_update
BEFORE UPDATE ON research_package_source
BEGIN
  SELECT RAISE(ABORT, 'research package sources are immutable');
END;

CREATE TRIGGER research_package_source_immutable_delete
BEFORE DELETE ON research_package_source
BEGIN
  SELECT RAISE(ABORT, 'research package sources are immutable');
END;

CREATE TRIGGER claim_evidence_immutable_update
BEFORE UPDATE ON claim_evidence
BEGIN
  SELECT RAISE(ABORT, 'claim evidence is immutable');
END;

CREATE TRIGGER claim_evidence_immutable_delete
BEFORE DELETE ON claim_evidence
BEGIN
  SELECT RAISE(ABORT, 'claim evidence is immutable');
END;

CREATE TRIGGER claim_revision_immutable_update
BEFORE UPDATE ON claim_revision
BEGIN
  SELECT RAISE(ABORT, 'claim revisions are immutable');
END;

CREATE TRIGGER claim_revision_immutable_delete
BEFORE DELETE ON claim_revision
BEGIN
  SELECT RAISE(ABORT, 'claim revisions are immutable');
END;

CREATE TRIGGER article_fact_check_immutable_update
BEFORE UPDATE ON article_fact_check
BEGIN
  SELECT RAISE(ABORT, 'article fact checks are immutable');
END;

CREATE TRIGGER article_fact_check_immutable_delete
BEFORE DELETE ON article_fact_check
BEGIN
  SELECT RAISE(ABORT, 'article fact checks are immutable');
END;

UPDATE schema_metadata
SET value = '7', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'news_schema_version';
