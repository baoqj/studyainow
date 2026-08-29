import { ADMIN_INTERVIEW_SETS } from '../../../../_lib/interviewCatalog';
import { ApiError, errorResponse, json, routeParam } from '../../../../_lib/http';
import { requireOrganizationPermission } from '../../../../_lib/organizations';

export const onRequestGet: PagesFunction<Env, 'organizationId'> = async ({ request, env, params }) => {
  try {
    const organizationId = routeParam(params.organizationId);
    if (!organizationId) throw new ApiError(404, 'Organization not found');
    await requireOrganizationPermission(env.DB, request, organizationId);
    const [courses, jobs] = await Promise.all([
      env.DB.prepare(
        `SELECT id, title, slug, topic, level FROM courses
         WHERE status = 'published' AND visibility = 'public' ORDER BY updated_at DESC LIMIT 200`,
      ).all(),
      env.DB.prepare(
        `SELECT job_postings.id, job_postings.title, job_postings.slug, companies.name AS company_name,
                job_postings.location_text
         FROM job_postings JOIN companies ON companies.id = job_postings.company_id
         WHERE job_postings.status = 'published'
         ORDER BY COALESCE(job_postings.source_published_at, job_postings.collected_at) DESC LIMIT 200`,
      ).all(),
    ]);
    return json({ courses: courses.results, jobs: jobs.results, interviews: ADMIN_INTERVIEW_SETS });
  } catch (error) { return errorResponse(error); }
};
