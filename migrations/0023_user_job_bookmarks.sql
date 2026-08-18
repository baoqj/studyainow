PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_job_bookmarks (
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_job_bookmarks_user_created
  ON user_job_bookmarks(user_id, created_at DESC);
