-- Resume generator V1: each record is user-owned and is never queried without
-- the authenticated user_id. Uploaded originals are intentionally not retained
-- here; only the extracted text and its structured, reviewable facts are kept.
ALTER TABLE resume_profiles ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE resume_profiles ADD COLUMN contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE resume_profiles ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE resume_profiles ADD COLUMN source_updated_at TEXT;

CREATE TABLE IF NOT EXISTS resume_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT '',
  template_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS resume_templates_user_updated_idx
  ON resume_templates(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS resume_source_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'manual')),
  parse_status TEXT NOT NULL CHECK (parse_status IN ('parsed', 'needs_review', 'failed')),
  extracted_text TEXT NOT NULL DEFAULT '',
  extracted_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS resume_source_documents_user_created_idx
  ON resume_source_documents(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS resume_exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resume_version_id TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('docx', 'pdf', 'md')),
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_version_id) REFERENCES resume_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS resume_exports_user_created_idx
  ON resume_exports(user_id, created_at DESC);
