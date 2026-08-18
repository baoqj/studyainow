import { getAuthUser } from '../../../_lib/auth';
import { errorResponse, json } from '../../../_lib/http';

type ChapterRow = { chapter_number: number; is_free: number };

export const onRequestGet: PagesFunction<Env, 'courseId'> = async ({ request, env, params }) => {
  try {
    const courseKey = typeof params.courseId === 'string' ? params.courseId : null;
    if (!courseKey) return json({ error: 'Course not found' }, { status: 404 });

    const chapters = await env.DB
      .prepare(
        `SELECT chapters.chapter_number, chapters.is_free
         FROM chapters JOIN courses ON courses.id = chapters.course_id
         WHERE courses.slug = ? OR courses.id = ?
         ORDER BY chapters.order_index ASC`,
      )
      .bind(courseKey, courseKey)
      .all<ChapterRow>();
    const user = await getAuthUser(env.DB, request);
    const rules = chapters.results.map((chapter) => ({
      chapterNumber: chapter.chapter_number,
      isFree: Boolean(chapter.is_free),
      locked: !chapter.is_free && !user,
    }));

    return json({
      authenticated: Boolean(user),
      courseManaged: chapters.results.length > 0,
      chapters: rules,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
