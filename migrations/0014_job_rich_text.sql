-- Public job descriptions are represented as a constrained JSON document.
-- Raw ATS HTML stays private in R2 source snapshots and is never rendered.
ALTER TABLE job_sections ADD COLUMN rich_content_json TEXT;

-- A durable cursor/lock lets scheduled work finish the legacy conversion in
-- bounded Worker invocations without two requests rebuilding the same job.
CREATE TABLE IF NOT EXISTS job_rich_text_backfill_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locked_until TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO job_rich_text_backfill_state (id) VALUES (1);
