import { requireAdmin } from '../../../_lib/auth';
import { errorResponse, json, readJson } from '../../../_lib/http';
import { enqueuePublishedCourseKnowledge, runKnowledgeGraphRefresh } from '../../../_lib/knowledgeGraph';

type RefreshPayload = { limit?: unknown; sourceType?: unknown };

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(env.DB, request);
    const body: RefreshPayload = await readJson<RefreshPayload>(request).catch(() => ({} as RefreshPayload));
    const requested = typeof body.limit === 'number' ? body.limit : 4;
    const limit = Math.max(1, Math.min(16, Math.floor(requested)));
    const sourceType = body.sourceType === 'job_version' || body.sourceType === 'course_chapter' || body.sourceType === 'creator_course'
      ? body.sourceType
      : undefined;
    const courseQueue = await enqueuePublishedCourseKnowledge(env, 400);
    const analysis = await runKnowledgeGraphRefresh(env, limit, sourceType);
    return json({ courseQueue, analysis });
  } catch (error) {
    return errorResponse(error);
  }
};
