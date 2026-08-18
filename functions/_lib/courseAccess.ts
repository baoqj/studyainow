import { getAuthUser } from './auth';

export type ChapterAccess = {
  courseId: string | null;
  courseSlug: string;
  chapterNumber: number;
  isFree: boolean;
  locked: boolean;
};

type ChapterRow = { course_id: string; course_slug: string; chapter_number: number; is_free: number };

export async function getChapterAccess(db: D1Database, request: Request, courseKey: string, chapterNumber: number): Promise<ChapterAccess> {
  const row = await db
    .prepare(
      `SELECT courses.id AS course_id, courses.slug AS course_slug, chapters.chapter_number, chapters.is_free
       FROM courses JOIN chapters ON chapters.course_id = courses.id
       WHERE (courses.slug = ? OR courses.id = ?) AND chapters.chapter_number = ?`,
    )
    .bind(courseKey, courseKey, chapterNumber)
    .first<ChapterRow>();

  // Static catalogue-only courses remain public until they are imported into
  // D1. A known D1 chapter uses is_free as the single source of truth.
  if (!row) {
    return { courseId: null, courseSlug: courseKey, chapterNumber, isFree: true, locked: false };
  }

  if (row.is_free) {
    return { courseId: row.course_id, courseSlug: row.course_slug, chapterNumber: row.chapter_number, isFree: true, locked: false };
  }

  const user = await getAuthUser(db, request);
  return {
    courseId: row.course_id,
    courseSlug: row.course_slug,
    chapterNumber: row.chapter_number,
    isFree: false,
    locked: !user,
  };
}
