import { requireUser } from '../../../_lib/auth';
import { ApiError, errorResponse, json } from '../../../_lib/http';

async function findJob(env: Env, slug: string) {
  const job = await env.DB.prepare(
    "SELECT id FROM job_postings WHERE slug = ? AND status = 'published'",
  ).bind(slug).first<{ id: string }>();
  if (!job) throw new ApiError(404, 'Job not found');
  return job;
}

export const onRequestPut: PagesFunction<Env, 'slug'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const slug = typeof params.slug === 'string' ? params.slug : '';
    if (!slug) throw new ApiError(404, 'Job not found');
    const job = await findJob(env, slug);
    await env.DB.prepare(
      'INSERT OR IGNORE INTO user_job_bookmarks (user_id, job_id) VALUES (?, ?)',
    ).bind(user.id, job.id).run();
    return json({ bookmarked: true });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env, 'slug'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const slug = typeof params.slug === 'string' ? params.slug : '';
    if (!slug) throw new ApiError(404, 'Job not found');
    const job = await findJob(env, slug);
    await env.DB.prepare(
      'DELETE FROM user_job_bookmarks WHERE user_id = ? AND job_id = ?',
    ).bind(user.id, job.id).run();
    return json({ bookmarked: false });
  } catch (error) {
    return errorResponse(error);
  }
};
