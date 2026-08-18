import { requireAdmin } from '../../../_lib/auth';
import { errorResponse, json } from '../../../_lib/http';

export const onRequestGet: PagesFunction<Env, 'jobId'> = async ({ env, request, params }) => {
  try {
    await requireAdmin(env.DB, request);
    const jobId = typeof params.jobId === 'string' ? params.jobId : null;
    if (!jobId) return json({ error: 'Job not found' }, { status: 404 });
    const job = await env.DB.prepare(
      `SELECT job_postings.id, job_postings.slug, job_postings.title, job_postings.status, job_postings.source_url,
              job_postings.original_source_url, job_postings.source_published_at, job_postings.collected_at,
              job_postings.suspected_expired_at, job_postings.last_url_checked_at, job_postings.url_check_status,
              job_postings.display_policy, job_postings.current_version_id,
              companies.name AS company_name, job_sources.source_type, job_sources.official_career_url
       FROM job_postings JOIN companies ON companies.id = job_postings.company_id
       JOIN job_sources ON job_sources.id = job_postings.source_id WHERE job_postings.id = ?`,
    ).bind(jobId).first();
    if (!job) return json({ error: 'Job not found' }, { status: 404 });
    const [sections, evidence, history] = await Promise.all([
      env.DB.prepare('SELECT id, title, public_text, order_index FROM job_sections WHERE job_id = ? AND version_id = ? ORDER BY order_index')
        .bind(jobId, (job as { current_version_id: string }).current_version_id).all(),
      env.DB.prepare(
        `SELECT job_skill_evidence.id, job_skill_evidence.skill_id, job_skill_evidence.evidence_text,
                job_skill_evidence.start_offset, job_skill_evidence.end_offset, job_skill_evidence.requirement_level,
                job_skill_evidence.confidence, job_skill_evidence.review_status, skills.name_en, skills.name_zh
         FROM job_skill_evidence JOIN skills ON skills.id = job_skill_evidence.skill_id
         WHERE job_skill_evidence.job_id = ? AND job_skill_evidence.version_id = ?
         ORDER BY job_skill_evidence.section_id, job_skill_evidence.start_offset`,
      ).bind(jobId, (job as { current_version_id: string }).current_version_id).all(),
      env.DB.prepare('SELECT decision, notes, created_at FROM job_reviews WHERE job_id = ? ORDER BY created_at DESC').bind(jobId).all(),
    ]);
    return json({ job, sections: sections.results, evidence: evidence.results, reviews: history.results });
  } catch (error) {
    return errorResponse(error);
  }
};
