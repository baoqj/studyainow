-- Lesson-level learning records are the source of truth for completion.
-- The existing chapter_progress table is retained for backward compatibility
-- and lightweight reading-position recovery.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  lesson_route_id TEXT NOT NULL,
  lesson_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('reading', 'completed')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  scroll_y INTEGER NOT NULL DEFAULT 0,
  last_read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, course_id, lesson_route_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course_read
  ON lesson_progress(user_id, course_id, last_read_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_chapter
  ON lesson_progress(user_id, course_id, chapter_id, status);
