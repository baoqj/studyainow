import { requireAdmin } from '../../../../../_lib/auth';
import { errorResponse, json, readJson } from '../../../../../_lib/http';
import { reviewSkillCandidate, reviewSkillRelationCandidate } from '../../../../../_lib/knowledgeGraph';

type ReviewPayload = { decision?: unknown; note?: unknown; kind?: unknown };

export const onRequestPost: PagesFunction<Env, 'candidateId'> = async ({ env, request, params }) => {
  try {
    const admin = await requireAdmin(env.DB, request);
    const candidateId = typeof params.candidateId === 'string' ? params.candidateId : null;
    if (!candidateId) return json({ error: 'Candidate not found' }, { status: 404 });
    const body = await readJson<ReviewPayload>(request);
    const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : null;
    if (!decision) return json({ error: 'decision must be approved or rejected' }, { status: 400 });
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2_000) || null : null;
    const result = body.kind === 'relation'
      ? await reviewSkillRelationCandidate(env.DB, admin.id, candidateId, decision, note)
      : await reviewSkillCandidate(env.DB, admin.id, candidateId, decision, note);
    return json({ candidateId, ...result });
  } catch (error) {
    return errorResponse(error);
  }
};
