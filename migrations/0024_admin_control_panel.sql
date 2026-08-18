-- StudyAINow administrator control panel.
-- D1 executes each migration transactionally. Runtime edits that touch more
-- than one table use D1 batch transactions and optimistic version checks.
PRAGMA foreign_keys = ON;

-- Expand the original user/admin role pair without changing the stable
-- `admin` key already used by authentication guards.
CREATE TABLE user_roles_v2 (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'member', 'operator', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO user_roles_v2 (user_id, role, created_at)
SELECT user_id, role, created_at FROM user_roles;

DROP TABLE user_roles;
ALTER TABLE user_roles_v2 RENAME TO user_roles;
CREATE INDEX IF NOT EXISTS idx_user_roles_role_user ON user_roles(role, user_id);

-- First-party courses are authored by StudyAINow unless a future import
-- explicitly supplies another creator label.
ALTER TABLE courses ADD COLUMN creator_name TEXT NOT NULL DEFAULT 'StudyAINow';

-- Preserve the creator workflow states while adding the four explicit
-- catalogue-control states requested by the administrator console.
CREATE TABLE creator_courses_v2 (
  id TEXT PRIMARY KEY,
  creator_user_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  body_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'changes_requested', 'recommended',
    'published', 'expired', 'blocked', 'archived'
  )),
  reviewer_user_id TEXT,
  review_note TEXT,
  recommended_at TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO creator_courses_v2 (
  id, creator_user_id, slug, title, summary, language, body_markdown,
  status, reviewer_user_id, review_note, recommended_at, points_awarded,
  created_at, updated_at
)
SELECT
  id, creator_user_id, slug, title, summary, language, body_markdown,
  status, reviewer_user_id, review_note, recommended_at, points_awarded,
  created_at, updated_at
FROM creator_courses;

DROP TABLE creator_courses;
ALTER TABLE creator_courses_v2 RENAME TO creator_courses;
CREATE INDEX IF NOT EXISTS creator_courses_creator_status_idx
  ON creator_courses(creator_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS creator_courses_review_status_idx
  ON creator_courses(status, updated_at DESC);

-- Page-level click events are stored separately from reading progress. This
-- keeps anonymous traffic measurable and prevents scrolling updates from
-- inflating learner counts.
CREATE TABLE IF NOT EXISTS course_engagement_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  course_type TEXT NOT NULL CHECK (course_type IN ('system', 'creator')),
  course_id TEXT NOT NULL,
  chapter_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('click')),
  page_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_course_engagement_course_created
  ON course_engagement_events(course_type, course_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_engagement_chapter_created
  ON course_engagement_events(course_type, chapter_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_events_course_created
  ON reading_events(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_course_updated
  ON chapter_progress(course_id, chapter_id, updated_at DESC);

