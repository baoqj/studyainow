-- Organization tenancy, scoped Leader role, invitation lifecycle, messaging,
-- delivery records, and searchable audit history.
PRAGMA foreign_keys = ON;

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('company', 'school', 'training', 'community', 'other')),
  description TEXT,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  leader_user_id TEXT,
  created_by TEXT NOT NULL,
  last_active_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX organizations_active_leader_idx
  ON organizations(leader_user_id) WHERE leader_user_id IS NOT NULL;
CREATE INDEX organizations_status_created_idx ON organizations(status, created_at DESC);
CREATE INDEX organizations_name_idx ON organizations(name);

ALTER TABLE users ADD COLUMN organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN organization_joined_at TEXT;
ALTER TABLE users ADD COLUMN organization_role TEXT CHECK (organization_role IN ('member', 'leader'));
CREATE INDEX users_organization_joined_idx ON users(organization_id, organization_joined_at DESC);

CREATE TABLE user_roles_v3 (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'member', 'operator', 'leader', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO user_roles_v3 (user_id, role, created_at)
SELECT user_id, role, created_at FROM user_roles;
DROP TABLE user_roles;
ALTER TABLE user_roles_v3 RENAME TO user_roles;
CREATE INDEX idx_user_roles_role_user ON user_roles(role, user_id);

CREATE TABLE organization_invites (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  code_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TEXT NOT NULL,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 1),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by TEXT,
  revoked_at TEXT,
  last_used_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX organization_invites_org_status_idx ON organization_invites(organization_id, status, created_at DESC);
CREATE INDEX organization_invites_expiry_idx ON organization_invites(status, expires_at);

ALTER TABLE oauth_states ADD COLUMN organization_invite_id TEXT REFERENCES organization_invites(id) ON DELETE SET NULL;

CREATE TABLE organization_invite_validation_attempts (
  id TEXT PRIMARY KEY,
  fingerprint_hash TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX organization_invite_validation_rate_idx
  ON organization_invite_validation_attempts(fingerprint_hash, created_at DESC);

CREATE TABLE organization_invite_uses (
  id TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invite_id) REFERENCES organization_invites(id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (invite_id, user_id)
);
CREATE INDEX organization_invite_uses_org_time_idx ON organization_invite_uses(organization_id, used_at DESC);

CREATE TABLE organization_messages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('notice', 'course', 'job', 'interview')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  content_refs_json TEXT NOT NULL DEFAULT '[]',
  target_rule TEXT NOT NULL CHECK (target_rule IN ('all', 'selected')),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  request_id TEXT NOT NULL UNIQUE,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX organization_messages_org_sent_idx ON organization_messages(organization_id, sent_at DESC);

CREATE TABLE user_notifications_v2 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('learning_reminder', 'course_update', 'creator_review', 'career_plan', 'organization_message', 'organization_membership')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO user_notifications_v2 (id, user_id, kind, title, body, action_url, read_at, created_at)
SELECT id, user_id, kind, title, body, action_url, read_at, created_at FROM user_notifications;
DROP TABLE user_notifications;
ALTER TABLE user_notifications_v2 RENAME TO user_notifications;
CREATE INDEX user_notifications_user_unread_idx ON user_notifications(user_id, read_at, created_at DESC);

CREATE TABLE organization_message_recipients (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  notification_id TEXT NOT NULL UNIQUE,
  delivery_status TEXT NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('delivered', 'failed')),
  delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES organization_messages(id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (notification_id) REFERENCES user_notifications(id) ON DELETE RESTRICT,
  UNIQUE (message_id, user_id)
);
CREATE INDEX organization_message_recipients_org_user_idx ON organization_message_recipients(organization_id, user_id, delivered_at DESC);

CREATE TABLE organization_audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX organization_audit_logs_org_time_idx ON organization_audit_logs(organization_id, created_at DESC, id DESC);
CREATE INDEX organization_audit_logs_action_time_idx ON organization_audit_logs(action, created_at DESC);

-- Leader assignment is guarded by a single D1 batch in the organization API:
-- the user membership/role rows and organizations.leader_user_id are updated
-- together after an optimistic-lock check. Keeping that cross-table invariant
-- in application batches avoids D1's remote migration parser splitting a
-- multi-statement trigger body.
