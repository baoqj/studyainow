-- Authenticated page activity for administrator user-history review.
-- The user_id is always derived from the server-side session; clients never
-- choose the account that owns an event.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_activity_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view' CHECK (event_type IN ('page_view', 'action')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'course', 'job', 'interview', 'resume', 'admin')),
  page_title TEXT NOT NULL,
  route TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_time
  ON user_activity_events(user_id, occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_category_time
  ON user_activity_events(user_id, category, occurred_at DESC, id DESC);
