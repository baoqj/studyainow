PRAGMA foreign_keys = ON;

-- Public job discussion is deliberately small and reviewable: only a member's
-- display name and visible text are exposed; email addresses and user IDs stay
-- private. The status column reserves a moderation path without changing the
-- public API later.
CREATE TABLE IF NOT EXISTS job_comments (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_comments_visible_created
  ON job_comments(job_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_comments_user_created
  ON job_comments(user_id, created_at DESC);
