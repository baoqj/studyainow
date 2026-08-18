-- Email delivery audit, recipient preferences, and device fingerprints.
-- Transactional account-security messages are never disabled by marketing
-- preferences. Engagement and marketing sends are recorded so scheduled
-- campaigns stay idempotent across Worker retries.

ALTER TABLE users ADD COLUMN marketing_email_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (marketing_email_enabled IN (0, 1));

CREATE TABLE IF NOT EXISTS email_deliveries (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  recipient_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('transactional', 'engagement', 'marketing')),
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  subject TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  skip_reason TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_user_event_created
  ON email_deliveries(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status_created
  ON email_deliveries(status, created_at);

CREATE TABLE IF NOT EXISTS account_login_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  user_agent TEXT,
  country_code TEXT,
  city TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_alerted_at TEXT,
  UNIQUE (user_id, fingerprint_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_login_devices_user_seen
  ON account_login_devices(user_id, last_seen_at DESC);
