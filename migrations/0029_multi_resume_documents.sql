-- Resume documents V2. A user may keep multiple independent resumes, while
-- capability templates remain reusable across those documents. Original uploads
-- are still not retained; only reviewable extracted facts are stored.
CREATE TABLE IF NOT EXISTS resume_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS resume_documents_user_updated_idx
  ON resume_documents(user_id, updated_at DESC);

ALTER TABLE resume_source_documents ADD COLUMN resume_id TEXT;
ALTER TABLE resume_source_documents ADD COLUMN extraction_provider TEXT NOT NULL DEFAULT 'fallback';
ALTER TABLE resume_source_documents ADD COLUMN extraction_note TEXT NOT NULL DEFAULT '';
ALTER TABLE resume_versions ADD COLUMN resume_id TEXT;

CREATE INDEX IF NOT EXISTS resume_source_documents_resume_created_idx
  ON resume_source_documents(resume_id, created_at DESC);
CREATE INDEX IF NOT EXISTS resume_versions_resume_created_idx
  ON resume_versions(resume_id, created_at DESC);

-- Preserve the single-profile implementation as each user's initial resume.
-- The legacy profile is retained as a compatibility mirror during the migration.
INSERT OR IGNORE INTO resume_documents (id, user_id, name, status, profile_json, created_at, updated_at)
SELECT
  'legacy-' || user_id,
  user_id,
  CASE WHEN TRIM(full_name) <> '' THEN full_name || ' Resume' ELSE 'Imported resume' END,
  'draft',
  profile_json,
  COALESCE(source_updated_at, updated_at, CURRENT_TIMESTAMP),
  COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM resume_profiles;

UPDATE resume_source_documents
SET resume_id = 'legacy-' || user_id,
    extraction_note = CASE
      WHEN TRIM(extracted_text) = '' AND TRIM(extraction_note) = '' THEN 'No readable source text was retained for this upload.'
      ELSE extraction_note
    END
WHERE resume_id IS NULL;

UPDATE resume_versions
SET resume_id = 'legacy-' || user_id
WHERE resume_id IS NULL;
