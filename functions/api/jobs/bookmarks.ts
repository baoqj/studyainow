import { requireUser } from '../../_lib/auth';
import { errorResponse, json } from '../../_lib/http';

type BookmarkJobRow = {
  slug: string;
  title: string;
  company_name: string;
  company_slug: string;
  location_text: string | null;
  remote_type: string;
  employment_type: string | null;
  status: string;
  source_published_at: string | null;
  collected_at: string | null;
  suspected_expired_at: string | null;
  skill_count: number;
  primary_skill_name_zh: string | null;
  primary_skill_name_en: string | null;
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  city_name: string | null;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const jobs = await env.DB.prepare(
      `SELECT job_postings.slug, job_postings.title, companies.name AS company_name, companies.slug AS company_slug,
              job_postings.location_text, job_postings.remote_type, job_postings.employment_type, job_postings.status,
              job_postings.source_published_at, job_postings.collected_at, job_postings.suspected_expired_at,
              (SELECT country_code FROM job_locations primary_location
                WHERE primary_location.job_id = job_postings.id AND primary_location.version_id = job_postings.current_version_id
                ORDER BY (primary_location.country_code IS NOT NULL) DESC, primary_location.is_primary DESC, primary_location.confidence DESC, primary_location.created_at ASC LIMIT 1) AS country_code,
              (SELECT country_name FROM job_locations primary_location
                WHERE primary_location.job_id = job_postings.id AND primary_location.version_id = job_postings.current_version_id
                ORDER BY (primary_location.country_code IS NOT NULL) DESC, primary_location.is_primary DESC, primary_location.confidence DESC, primary_location.created_at ASC LIMIT 1) AS country_name,
              (SELECT region_name FROM job_locations primary_location
                WHERE primary_location.job_id = job_postings.id AND primary_location.version_id = job_postings.current_version_id
                ORDER BY (primary_location.country_code IS NOT NULL) DESC, primary_location.is_primary DESC, primary_location.confidence DESC, primary_location.created_at ASC LIMIT 1) AS region_name,
              (SELECT city_name FROM job_locations primary_location
                WHERE primary_location.job_id = job_postings.id AND primary_location.version_id = job_postings.current_version_id
                ORDER BY (primary_location.country_code IS NOT NULL) DESC, primary_location.is_primary DESC, primary_location.confidence DESC, primary_location.created_at ASC LIMIT 1) AS city_name,
              COUNT(DISTINCT job_skill_evidence.skill_id) AS skill_count,
              (SELECT skills.name_zh FROM job_skill_evidence primary_evidence
                 JOIN skills ON skills.id = primary_evidence.skill_id
                WHERE primary_evidence.job_id = job_postings.id
                  AND primary_evidence.version_id = job_postings.current_version_id
                  AND primary_evidence.review_status = 'approved'
                ORDER BY primary_evidence.confidence DESC, skills.name_en ASC LIMIT 1) AS primary_skill_name_zh,
              (SELECT skills.name_en FROM job_skill_evidence primary_evidence
                 JOIN skills ON skills.id = primary_evidence.skill_id
                WHERE primary_evidence.job_id = job_postings.id
                  AND primary_evidence.version_id = job_postings.current_version_id
                  AND primary_evidence.review_status = 'approved'
                ORDER BY primary_evidence.confidence DESC, skills.name_en ASC LIMIT 1) AS primary_skill_name_en
       FROM user_job_bookmarks
       JOIN job_postings ON job_postings.id = user_job_bookmarks.job_id
       JOIN companies ON companies.id = job_postings.company_id
       LEFT JOIN job_skill_evidence ON job_skill_evidence.job_id = job_postings.id
         AND job_skill_evidence.version_id = job_postings.current_version_id
         AND job_skill_evidence.review_status = 'approved'
       WHERE user_job_bookmarks.user_id = ? AND job_postings.status = 'published'
       GROUP BY job_postings.id
       ORDER BY user_job_bookmarks.created_at DESC`,
    ).bind(user.id).all<BookmarkJobRow>();

    return json({ jobs: jobs.results.map((job) => ({
      slug: job.slug,
      title: job.title,
      company: { name: job.company_name, slug: job.company_slug },
      location: job.location_text,
      geography: job.country_code || job.city_name || job.region_name ? {
        countryCode: job.country_code,
        countryName: job.country_name,
        regionName: job.region_name,
        cityName: job.city_name,
      } : null,
      remoteType: job.remote_type,
      employmentType: job.employment_type,
      status: job.status,
      publishedAt: job.source_published_at ?? job.collected_at,
      collectedAt: job.collected_at,
      suspectedExpiredAt: job.suspected_expired_at,
      skillCount: Number(job.skill_count ?? 0),
      primarySkill: job.primary_skill_name_en ? { zh: job.primary_skill_name_zh, en: job.primary_skill_name_en } : null,
      bookmarked: true,
    })) });
  } catch (error) {
    return errorResponse(error);
  }
};
