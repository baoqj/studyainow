import { requireAdmin } from '../../../../_lib/auth';
import { errorResponse, json } from '../../../../_lib/http';
import { runSourceSync, startSourceSync } from '../../../../_lib/jobs';

export const onRequestPost: PagesFunction<Env, 'sourceId'> = async ({ env, request, params, waitUntil }) => {
  try {
    await requireAdmin(env.DB, request);
    const sourceId = typeof params.sourceId === 'string' ? params.sourceId : null;
    if (!sourceId) return json({ error: 'Source not found' }, { status: 404 });
    const runId = await startSourceSync(env.DB, sourceId);
    // This bounded manual trigger is deliberately not a substitute for a queue.
    // Scheduled, high-volume acquisition should be moved to a Queue consumer before it is enabled.
    waitUntil(runSourceSync(env, sourceId, runId));
    return json({ runId, status: 'queued' }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
};
