import { clampInt, errorResponse, json } from '../../../_lib/http';
import { requireAdminOrLeader } from '../../../_lib/organizations';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const actor = await requireAdminOrLeader(env.DB, request);
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get('status') ?? 'needs_review';
    const status = !actor.isAdmin ? 'published' : ['draft', 'normalized', 'needs_review', 'approved', 'published', 'possibly_expired', 'expired', 'closed', 'archived', 'rejected'].includes(requestedStatus)
      ? requestedStatus
      : 'needs_review';
    const limit = clampInt(url.searchParams.get('limit'), 1, 100, 50);
    const jobs = await env.DB.prepare(
      `SELECT job_postings.id, job_postings.slug, job_postings.title, job_postings.status, job_postings.display_policy,
              job_postings.location_text, job_postings.remote_type, job_postings.employment_type,
              job_postings.source_url, job_postings.original_source_url, job_postings.source_published_at, job_postings.collected_at,
              job_postings.suspected_expired_at, job_postings.last_url_checked_at, job_postings.url_check_status,
              job_postings.expires_at, job_postings.current_version_id,
              companies.name AS company_name, job_sources.source_type,
              (SELECT COUNT(*) FROM job_skill_evidence
                WHERE job_skill_evidence.job_id = job_postings.id
                  AND job_skill_evidence.version_id = job_postings.current_version_id) AS evidence_count,
              (SELECT COUNT(*) FROM job_skill_evidence
                WHERE job_skill_evidence.job_id = job_postings.id
                  AND job_skill_evidence.version_id = job_postings.current_version_id
                  AND job_skill_evidence.review_status = 'pending') AS pending_evidence_count
       FROM job_postings
       JOIN companies ON companies.id = job_postings.company_id
       JOIN job_sources ON job_sources.id = job_postings.source_id
       WHERE job_postings.status = ?
       ORDER BY COALESCE(job_postings.source_published_at, job_postings.collected_at) DESC, job_postings.title ASC LIMIT ?`,
    ).bind(status, limit).all();
    return json({ jobs: jobs.results, status, readOnly: !actor.isAdmin });
  } catch (error) {
    return errorResponse(error);
  }
};
