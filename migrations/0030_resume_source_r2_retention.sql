-- Keep each newly uploaded resume source in private R2 storage so the owner
-- can delete both the original file and its extracted D1 record together.
-- Historical sources intentionally have no key because their originals were
-- not retained before this migration.
ALTER TABLE resume_source_documents ADD COLUMN r2_key TEXT;

CREATE INDEX IF NOT EXISTS resume_source_documents_r2_key_idx
  ON resume_source_documents(r2_key);
