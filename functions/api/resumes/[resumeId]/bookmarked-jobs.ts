import { requireUser } from '../../../_lib/auth';
import { ApiError, errorResponse, json } from '../../../_lib/http';
import { listBookmarkedResumeJobs } from '../../../_lib/bookmarkedResumeJobs';

function resumeId(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'resumeId is required');
  return value.trim().slice(0, 100);
}

/** A private, concise list used only by the selected resume's JD generator. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const id = resumeId(params.resumeId);
    const document = await env.DB.prepare('SELECT id FROM resume_documents WHERE id = ? AND user_id = ?').bind(id, user.id).first();
    if (!document) throw new ApiError(404, 'Resume not found');
    const jobs = await listBookmarkedResumeJobs(env.DB, user.id);
    return json({ jobs: jobs.map(({ referenceText: _referenceText, ...job }) => job) });
  } catch (error) {
    return errorResponse(error);
  }
};
