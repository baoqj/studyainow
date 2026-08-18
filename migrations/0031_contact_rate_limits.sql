-- Contact messages are delivered directly through Resend and deliberately are
-- not stored in D1. This table retains only a short-lived hashed network
-- identifier so the public form cannot be used as an email relay.
CREATE TABLE IF NOT EXISTS contact_rate_limits (
  identity_hash TEXT PRIMARY KEY,
  last_submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_rate_limits_last_submitted
  ON contact_rate_limits(last_submitted_at);
