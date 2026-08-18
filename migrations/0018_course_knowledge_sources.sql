-- Canonical, source-language course units for semantic extraction. A chapter
-- overview and each lesson are separate records, so a long chapter cannot
-- truncate its later lessons before knowledge analysis.
CREATE TABLE IF NOT EXISTS course_knowledge_sources (
  id TEXT PRIMARY KEY,
  course_slug TEXT NOT NULL,
  chapter_route_id TEXT NOT NULL,
  lesson_route_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  markdown_path TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (course_slug, chapter_route_id, lesson_route_id)
);

CREATE INDEX IF NOT EXISTS course_knowledge_sources_course_idx
  ON course_knowledge_sources(course_slug, chapter_route_id, lesson_route_id);
