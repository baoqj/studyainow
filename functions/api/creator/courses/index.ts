import { requireUser } from '../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../_lib/http';

interface CreatorCourseBody { title?: unknown; summary?: unknown; language?: unknown; bodyMarkdown?: unknown; slug?: unknown; }

function slugify(value: string) {
  const slug = value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
  if (!slug) throw new ApiError(400, 'A Latin-letter course slug is required');
  return slug;
}

function input(body: CreatorCourseBody) {
  const title = requireString(body.title, 'title');
  const summary = requireString(body.summary, 'summary');
  const language = typeof body.language === 'string' ? body.language : 'zh-CN';
  const bodyMarkdown = typeof body.bodyMarkdown === 'string' ? body.bodyMarkdown.trim() : '';
  const slug = slugify(typeof body.slug === 'string' && body.slug.trim() ? body.slug : title);
  if (title.length > 140 || summary.length > 600 || bodyMarkdown.length > 100_000) throw new ApiError(400, 'Course content is too long');
  if (!['zh-CN', 'zh-TW', 'en', 'fr', 'es'].includes(language)) throw new ApiError(400, 'Unsupported course language');
  return { title, summary, language, bodyMarkdown, slug };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const courses = await env.DB
      .prepare(
        `SELECT id, slug, title, summary, language, body_markdown, status, review_note, recommended_at, points_awarded, created_at, updated_at
         FROM creator_courses WHERE creator_user_id = ? ORDER BY updated_at DESC`,
      )
      .bind(user.id)
      .all();
    return json({ courses: courses.results });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const values = input(await readJson<CreatorCourseBody>(request));
    const id = crypto.randomUUID();
    try {
      await env.DB
        .prepare(
          `INSERT INTO creator_courses (id, creator_user_id, slug, title, summary, language, body_markdown)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, user.id, values.slug, values.title, values.summary, values.language, values.bodyMarkdown)
        .run();
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) throw new ApiError(409, 'Course slug is already in use');
      throw error;
    }
    return json({ id, ...values, status: 'draft' }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
