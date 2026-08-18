import { errorResponse, json } from '../../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const courses = await env.DB
      .prepare(
        `SELECT courses.*,
          (SELECT COUNT(*) FROM chapters WHERE chapters.course_id = courses.id) AS chapter_count
         FROM courses
         WHERE visibility IN ('public', 'members')
         ORDER BY published_at DESC`,
      )
      .all();

    return json({ courses: courses.results });
  } catch (error) {
    return errorResponse(error);
  }
};
