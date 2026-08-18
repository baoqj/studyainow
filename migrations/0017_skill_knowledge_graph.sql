-- The knowledge graph is deliberately separate from the reviewed vocabulary.
-- LLM output first becomes a candidate; only an explicit admin review can add
-- a public skill, JD highlight, lesson coverage record, or graph edge.

CREATE TABLE IF NOT EXISTS knowledge_refresh_queue (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('job_version', 'course_chapter', 'creator_course')),
  source_id TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  source_locator_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'skipped', 'error')),
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_error TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_type, source_id, source_hash)
);

CREATE INDEX IF NOT EXISTS knowledge_refresh_queue_status_idx
  ON knowledge_refresh_queue(status, locked_until, updated_at);

CREATE TABLE IF NOT EXISTS knowledge_analysis_runs (
  id TEXT PRIMARY KEY,
  queue_id TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'skipped', 'error')),
  input_characters INTEGER NOT NULL DEFAULT 0,
  output_json TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (queue_id) REFERENCES knowledge_refresh_queue(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS knowledge_analysis_runs_source_idx
  ON knowledge_analysis_runs(source_type, source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS skill_candidates (
  id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('job_version', 'course_chapter', 'creator_course')),
  source_id TEXT NOT NULL,
  canonical_skill_id TEXT,
  proposed_slug TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  aliases_json TEXT NOT NULL DEFAULT '[]',
  source_locator_json TEXT NOT NULL DEFAULT '{}',
  evidence_text TEXT NOT NULL DEFAULT '',
  evidence_start INTEGER,
  evidence_end INTEGER,
  requirement_level TEXT NOT NULL DEFAULT 'context' CHECK (requirement_level IN ('required', 'preferred', 'responsibility', 'context')),
  coverage_level TEXT CHECK (coverage_level IN ('intro', 'practice', 'advanced')),
  coverage_score INTEGER CHECK (coverage_score BETWEEN 0 AND 100),
  learning_outcome TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  raw_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_run_id) REFERENCES knowledge_analysis_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (canonical_skill_id) REFERENCES skills(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS skill_candidates_review_idx
  ON skill_candidates(status, source_type, confidence DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS skill_candidates_slug_idx
  ON skill_candidates(proposed_slug, status);

CREATE TABLE IF NOT EXISTS skill_relation_candidates (
  id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('job_version', 'course_chapter', 'creator_course')),
  source_id TEXT NOT NULL,
  from_skill_slug TEXT NOT NULL,
  to_skill_slug TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related_to', 'prerequisite_of', 'part_of', 'co_required_with', 'alternative_to')),
  weight REAL NOT NULL CHECK (weight >= 0 AND weight <= 1),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_run_id) REFERENCES knowledge_analysis_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS skill_relation_candidates_review_idx
  ON skill_relation_candidates(status, confidence DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS skill_relations (
  id TEXT PRIMARY KEY,
  from_skill_id TEXT NOT NULL,
  to_skill_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related_to', 'prerequisite_of', 'part_of', 'co_required_with', 'alternative_to')),
  weight REAL NOT NULL CHECK (weight >= 0 AND weight <= 1),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  source_method TEXT NOT NULL DEFAULT 'llm_reviewed',
  evidence TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (from_skill_id, to_skill_id, relation_type),
  CHECK (from_skill_id <> to_skill_id),
  FOREIGN KEY (from_skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (to_skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS skill_relations_from_idx ON skill_relations(from_skill_id, status, weight DESC);
CREATE INDEX IF NOT EXISTS skill_relations_to_idx ON skill_relations(to_skill_id, status, weight DESC);

-- Existing JDs are queued once. They stay non-public until their LLM
-- suggestions receive an explicit review, so this migration is safe to apply
-- before an LLM provider is configured.
INSERT OR IGNORE INTO knowledge_refresh_queue (id, source_type, source_id, source_hash, source_locator_json)
SELECT
  'kg-job-' || job_versions.id,
  'job_version',
  job_versions.id,
  job_versions.semantic_hash,
  '{"jobId":"' || job_postings.id || '","versionId":"' || job_versions.id || '"}'
FROM job_postings
JOIN job_versions ON job_versions.id = job_postings.current_version_id
JOIN job_sections ON job_sections.job_id = job_postings.id AND job_sections.version_id = job_postings.current_version_id
WHERE job_postings.status = 'published'
  AND LENGTH(TRIM(job_sections.public_text)) > 0;
