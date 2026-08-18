import { requireAdmin } from '../../../../_lib/auth';
import { errorResponse, json, readJson } from '../../../../_lib/http';
import { publishJobReview } from '../../../../_lib/jobs';

type ReviewPayload = { decision?: unknown; notes?: unknown };

export const onRequestPost: PagesFunction<Env, 'jobId'> = async ({ env, request, params }) => {
  try {
    const user = await requireAdmin(env.DB, request);
    const jobId = typeof params.jobId === 'string' ? params.jobId : null;
    if (!jobId) return json({ error: 'Job not found' }, { status: 404 });
    const payload = await readJson<ReviewPayload>(request);
    if (!['approved', 'rejected', 'needs_correction', 'archived'].includes(String(payload.decision))) {
      return json({ error: 'decision must be approved, rejected, needs_correction, or archived' }, { status: 400 });
    }
    const notes = typeof payload.notes === 'string' ? payload.notes.trim().slice(0, 2_000) || null : null;
    const result = await publishJobReview(env.DB, jobId, user.id, payload.decision as 'approved' | 'rejected' | 'needs_correction' | 'archived', notes);
    return json({ jobId, ...result });
  } catch (error) {
    return errorResponse(error);
  }
};
