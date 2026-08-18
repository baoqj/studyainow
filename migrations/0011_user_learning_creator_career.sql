-- Account, learner, creator and career records. All user-owned data is scoped
-- by user_id so a session can only read or mutate its own records.
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN preferred_locale TEXT NOT NULL DEFAULT 'zh-CN';
ALTER TABLE users ADD COLUMN notification_email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (notification_email_enabled IN (0, 1));
ALTER TABLE users ADD COLUMN avatar_key TEXT;

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'sparkles',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  awarded_reason TEXT NOT NULL,
  awarded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO badges (id, slug, name, description, icon) VALUES
  ('badge_verified_learner', 'verified-learner', 'Verified learner', 'Verified an email address and activated a learning account.', 'badge-check'),
  ('badge_first_completion', 'first-completion', 'First milestone', 'Completed a course chapter.', 'graduation-cap'),
  ('badge_course_creator', 'course-creator', 'Course creator', 'Published a recommended community course.', 'pen-line'),
  ('badge_career_ready', 'career-ready', 'Career ready', 'Created a role-targeted resume and interview study plan.', 'briefcase-business');

CREATE TABLE IF NOT EXISTS creator_courses (
  id TEXT PRIMARY KEY,
  creator_user_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  body_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'changes_requested', 'recommended', 'published', 'archived')),
  reviewer_user_id TEXT,
  review_note TEXT,
  recommended_at TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS creator_courses_creator_status_idx
  ON creator_courses(creator_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS creator_courses_review_status_idx
  ON creator_courses(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS resume_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  experience_json TEXT NOT NULL DEFAULT '[]',
  projects_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resume_versions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  job_slug TEXT,
  job_title TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  document_json TEXT NOT NULL,
  match_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS resume_versions_user_created_idx
  ON resume_versions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS resume_interview_questions (
  id TEXT PRIMARY KEY,
  resume_version_id TEXT NOT NULL,
  skill_id TEXT,
  skill_name TEXT NOT NULL,
  question TEXT NOT NULL,
  preparation TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_version_id) REFERENCES resume_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
  UNIQUE (resume_version_id, order_index)
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('learning_reminder', 'course_update', 'creator_review', 'career_plan')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
  ON user_notifications(user_id, read_at, created_at DESC);
