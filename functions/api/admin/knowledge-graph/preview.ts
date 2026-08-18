import { requireAdmin } from '../../../_lib/auth';
import { clampInt, errorResponse, json } from '../../../_lib/http';

type CountRow = { source_type?: string; status?: string; count: number; oldest_at?: string | null; newest_at?: string | null };

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(env.DB, request);
    const url = new URL(request.url);
    const limit = clampInt(url.searchParams.get('limit'), 1, 80, 40);
    const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
    const nodeFilter = query ? `AND (skills.slug LIKE ? OR skills.name_zh LIKE ? OR skills.name_en LIKE ? OR skills.category LIKE ?)` : '';
    const edgeFilter = query ? `AND (from_skill.slug LIKE ? OR from_skill.name_zh LIKE ? OR from_skill.name_en LIKE ? OR to_skill.slug LIKE ? OR to_skill.name_zh LIKE ? OR to_skill.name_en LIKE ?)` : '';
    const terms = `%${query}%`;

    const [summary, nodes, edges, queue, runs] = await Promise.all([
      env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM skills WHERE status = 'approved') AS approved_skills,
          (SELECT COUNT(*) FROM skill_relations WHERE status = 'approved') AS approved_relations,
          (SELECT COUNT(*) FROM job_skill_evidence WHERE review_status IN ('approved', 'edited')) AS approved_job_evidence,
          (SELECT COUNT(*) FROM lesson_skill_coverage WHERE review_status = 'approved') AS approved_course_coverage,
          (SELECT COUNT(*) FROM skill_candidates WHERE status = 'pending') AS pending_skill_candidates,
          (SELECT COUNT(*) FROM skill_relation_candidates WHERE status = 'pending') AS pending_relation_candidates,
          (SELECT COUNT(*) FROM knowledge_refresh_queue WHERE status IN ('pending', 'running', 'error')) AS outstanding_queue`,
      ).first(),
      env.DB.prepare(
        `SELECT skills.id, skills.slug, skills.name_zh, skills.name_en, skills.definition, skills.category, skills.difficulty,
          (SELECT COUNT(*) FROM job_skill_evidence evidence WHERE evidence.skill_id = skills.id AND evidence.review_status IN ('approved', 'edited')) AS job_evidence_count,
          (SELECT COUNT(*) FROM lesson_skill_coverage coverage WHERE coverage.skill_id = skills.id AND coverage.review_status = 'approved') AS course_coverage_count,
          (SELECT COUNT(*) FROM skill_relations relation WHERE relation.from_skill_id = skills.id AND relation.status = 'approved') AS outgoing_relation_count,
          (SELECT COUNT(*) FROM skill_relations relation WHERE relation.to_skill_id = skills.id AND relation.status = 'approved') AS incoming_relation_count
         FROM skills
         WHERE skills.status = 'approved' ${nodeFilter}
         ORDER BY (job_evidence_count + course_coverage_count + outgoing_relation_count + incoming_relation_count) DESC, skills.name_en ASC
         LIMIT ?`,
      ).bind(...(query ? [terms, terms, terms, terms] : []), limit).all(),
      env.DB.prepare(
        `SELECT skill_relations.id, skill_relations.relation_type, skill_relations.weight, skill_relations.confidence,
          skill_relations.source_method, skill_relations.evidence, skill_relations.updated_at,
          from_skill.id AS from_id, from_skill.slug AS from_slug, from_skill.name_zh AS from_name_zh, from_skill.name_en AS from_name_en,
          to_skill.id AS to_id, to_skill.slug AS to_slug, to_skill.name_zh AS to_name_zh, to_skill.name_en AS to_name_en
         FROM skill_relations
         JOIN skills AS from_skill ON from_skill.id = skill_relations.from_skill_id
         JOIN skills AS to_skill ON to_skill.id = skill_relations.to_skill_id
         WHERE skill_relations.status = 'approved' ${edgeFilter}
         ORDER BY skill_relations.weight DESC, skill_relations.confidence DESC, skill_relations.updated_at DESC
         LIMIT ?`,
      ).bind(...(query ? [terms, terms, terms, terms, terms, terms] : []), Math.min(limit * 3, 240)).all(),
      env.DB.prepare(
        `SELECT source_type, status, COUNT(*) AS count, MIN(created_at) AS oldest_at, MAX(updated_at) AS newest_at
         FROM knowledge_refresh_queue GROUP BY source_type, status ORDER BY source_type, status`,
      ).all<CountRow>(),
      env.DB.prepare(
        `SELECT provider, model, status, COUNT(*) AS count, MAX(started_at) AS last_started_at, MAX(completed_at) AS last_completed_at
         FROM knowledge_analysis_runs GROUP BY provider, model, status
         ORDER BY last_started_at DESC LIMIT 20`,
      ).all(),
    ]);

    return json({
      generatedAt: new Date().toISOString(),
      query,
      summary,
      nodes: nodes.results,
      edges: edges.results,
      queue: queue.results,
      runs: runs.results,
      graphSemantics: {
        nodes: 'Approved skills only',
        edges: 'Approved directed skill relations only',
        evidence: 'JD and course counts are reviewed supporting links, not graph edges',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
