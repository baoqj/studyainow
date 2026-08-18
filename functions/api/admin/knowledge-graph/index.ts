import { requireAdmin } from '../../../_lib/auth';
import { errorResponse, json } from '../../../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(env.DB, request);
    const url = new URL(request.url);
    const status = ['pending', 'approved', 'rejected', 'superseded'].includes(url.searchParams.get('status') ?? '')
      ? url.searchParams.get('status')!
      : 'pending';
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 40) || 40));
    const [candidates, relations, queue] = await Promise.all([
      env.DB.prepare(
        `SELECT skill_candidates.id, skill_candidates.source_type, skill_candidates.source_id, skill_candidates.proposed_slug,
                skill_candidates.name_zh, skill_candidates.name_en, skill_candidates.definition, skill_candidates.category,
                skill_candidates.difficulty, skill_candidates.evidence_text, skill_candidates.requirement_level,
                skill_candidates.coverage_level, skill_candidates.coverage_score, skill_candidates.learning_outcome,
                skill_candidates.confidence, skill_candidates.status, skill_candidates.created_at,
                skills.slug AS canonical_skill_slug
         FROM skill_candidates LEFT JOIN skills ON skills.id = skill_candidates.canonical_skill_id
         WHERE skill_candidates.status = ? ORDER BY skill_candidates.confidence DESC, skill_candidates.created_at DESC LIMIT ?`,
      ).bind(status, limit).all(),
      env.DB.prepare(
        `SELECT id, source_type, source_id, from_skill_slug, to_skill_slug, relation_type, weight, confidence, evidence, status, created_at
         FROM skill_relation_candidates WHERE status = ? ORDER BY confidence DESC, created_at DESC LIMIT ?`,
      ).bind(status, limit).all(),
      env.DB.prepare(
        `SELECT status, COUNT(*) AS count FROM knowledge_refresh_queue GROUP BY status ORDER BY status`,
      ).all(),
    ]);
    return json({ status, candidates: candidates.results, relationCandidates: relations.results, queue: queue.results });
  } catch (error) {
    return errorResponse(error);
  }
};
