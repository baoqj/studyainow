import { getAuthUser } from '../../_lib/auth';
import { clampInt, errorResponse, json } from '../../_lib/http';
import { cityAliasesForSlug, citySlugFor, isRegionOnlyLocation } from '../../../shared/jobLocations';

type JobRow = {
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
  bookmarked: number;
};

type CountryFilterRow = { code: string; name: string; count: number };
type CityFilterRow = { code: string; name: string; count: number };

const EUROPE_COUNTRY_CODES = [
  'AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU',
  'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI',
  'SK', 'SM', 'UA', 'VA', 'XK',
] as const;

function countryScope(value: string) {
  if (!value) return [];
  if (value === 'EU') return [...EUROPE_COUNTRY_CODES];
  return /^[A-Z]{2}$/.test(value) ? [value] : null;
}

function inPlaceholders(values: string[]) {
  return values.map(() => '?').join(', ');
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await getAuthUser(env.DB, request);
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
    const company = (url.searchParams.get('company') ?? '').trim().slice(0, 80);
    const skill = (url.searchParams.get('skill') ?? '').trim().slice(0, 100);
    const country = (url.searchParams.get('country') ?? '').trim().toUpperCase();
    const region = (url.searchParams.get('region') ?? '').trim().slice(0, 100);
    const city = (url.searchParams.get('city') ?? '').trim().slice(0, 100);
    const remote = url.searchParams.get('remote');
    // The public catalogue remains paginated at 50 cards. A JD detail page
    // needs one complete, exact-company directory for its independent left
    // column, so that narrowly scoped query may request up to 500 records.
    const limit = clampInt(url.searchParams.get('limit'), 1, company ? 500 : 50, 24);
    const offset = clampInt(url.searchParams.get('offset'), 0, 10000, 0);
    const params: unknown[] = [];
    const filters: string[] = ["job_postings.status = 'published'"];
    const countryCodes = countryScope(country);

    if (country && !countryCodes) {
      return json({ error: 'country must be an ISO 3166-1 alpha-2 code or EU' }, { status: 400 });
    }
    if (country || region || city) {
      const geographyFilters = [
        'geo_filter.job_id = job_postings.id',
        'geo_filter.version_id = job_postings.current_version_id',
      ];
      const geographyParams: unknown[] = [];
      if (countryCodes?.length) {
        geographyFilters.push(`geo_filter.country_code IN (${inPlaceholders(countryCodes)})`);
        geographyParams.push(...countryCodes);
      }
      if (city) {
        // URLs use a stable city key (for example `new-york`) while official
        // boards may send alternate source spellings such as "New York City".
        // The filter therefore matches the constrained, known aliases.
        const cityNames = countryCodes?.length === 1 ? cityAliasesForSlug(countryCodes[0], city) : [city];
        geographyFilters.push(`LOWER(geo_filter.city_name) IN (${inPlaceholders(cityNames)})`);
        geographyParams.push(...cityNames.map((name) => name.toLowerCase()));
      }
      if (region) {
        geographyFilters.push("LOWER(geo_filter.region_name) = LOWER(?)");
        geographyParams.push(region);
      }
      filters.push(`EXISTS (SELECT 1 FROM job_locations geo_filter WHERE ${geographyFilters.join(' AND ')})`);
      params.push(...geographyParams);
    }

    if (company) {
      filters.push('companies.slug = ?');
      params.push(company);
    }
    if (remote && ['remote', 'hybrid', 'on_site', 'unknown'].includes(remote)) {
      filters.push('job_postings.remote_type = ?');
      params.push(remote);
    }
    if (skill) {
      filters.push(`EXISTS (
        SELECT 1 FROM job_skill_evidence filter_evidence
        JOIN skills filter_skills ON filter_skills.id = filter_evidence.skill_id
        WHERE filter_evidence.job_id = job_postings.id
          AND filter_evidence.version_id = job_postings.current_version_id
          AND filter_evidence.review_status = 'approved'
          AND filter_skills.slug = ?
      )`);
      params.push(skill);
    }
    if (query) {
      const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
      filters.push(`(
        job_postings.title LIKE ? ESCAPE '\\'
        OR companies.name LIKE ? ESCAPE '\\'
        OR COALESCE(job_postings.location_text, '') LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM job_locations query_location
          WHERE query_location.job_id = job_postings.id
            AND query_location.version_id = job_postings.current_version_id
            AND (query_location.country_name LIKE ? ESCAPE '\\' OR query_location.region_name LIKE ? ESCAPE '\\' OR query_location.city_name LIKE ? ESCAPE '\\')
        )
        OR EXISTS (
          SELECT 1 FROM job_skill_evidence query_evidence
          JOIN skills query_skills ON query_skills.id = query_evidence.skill_id
          WHERE query_evidence.job_id = job_postings.id
            AND query_evidence.version_id = job_postings.current_version_id
            AND query_evidence.review_status = 'approved'
            AND (query_skills.name_en LIKE ? ESCAPE '\\' OR query_skills.name_zh LIKE ? ESCAPE '\\')
        )
      )`);
      params.push(like, like, like, like, like, like, like, like);
    }

    const where = filters.join(' AND ');
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
                ORDER BY primary_evidence.confidence DESC, skills.name_en ASC LIMIT 1) AS primary_skill_name_en,
              EXISTS (SELECT 1 FROM user_job_bookmarks
                WHERE user_job_bookmarks.user_id = ? AND user_job_bookmarks.job_id = job_postings.id) AS bookmarked
       FROM job_postings
       JOIN companies ON companies.id = job_postings.company_id
       LEFT JOIN job_skill_evidence ON job_skill_evidence.job_id = job_postings.id
         AND job_skill_evidence.version_id = job_postings.current_version_id
         AND job_skill_evidence.review_status = 'approved'
       WHERE ${where}
       GROUP BY job_postings.id
       ORDER BY COALESCE(job_postings.source_published_at, job_postings.collected_at) DESC, job_postings.title ASC
       LIMIT ? OFFSET ?`,
    ).bind(user?.id ?? '', ...params, limit, offset).all<JobRow>();

    const [total, stats, countries, cities] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS total
         FROM job_postings
         JOIN companies ON companies.id = job_postings.company_id
         WHERE ${where}`,
      ).bind(...params).first<{ total: number }>(),
      env.DB.prepare(
      `SELECT
         COUNT(*) AS published_jobs,
         COUNT(DISTINCT company_id) AS companies,
         COUNT(CASE WHEN EXISTS (
           SELECT 1 FROM job_skill_evidence
           WHERE job_skill_evidence.job_id = job_postings.id
             AND job_skill_evidence.version_id = job_postings.current_version_id
             AND job_skill_evidence.review_status = 'approved'
         ) THEN 1 END) AS mapped_jobs,
         MAX(COALESCE(source_published_at, collected_at)) AS published_at
       FROM job_postings WHERE status = 'published'`,
      ).first<{ published_jobs: number; companies: number; mapped_jobs: number; published_at: string | null }>(),
      env.DB.prepare(
        `SELECT job_locations.country_code AS code, MAX(job_locations.country_name) AS name, COUNT(DISTINCT job_locations.job_id) AS count
         FROM job_locations
         JOIN job_postings ON job_postings.id = job_locations.job_id
         WHERE job_postings.status = 'published'
           AND job_locations.version_id = job_postings.current_version_id
           AND job_locations.country_code IS NOT NULL
         GROUP BY job_locations.country_code
         ORDER BY name ASC`,
      ).all<CountryFilterRow>(),
      env.DB.prepare(
        `SELECT job_locations.country_code AS code, job_locations.city_name AS name, COUNT(DISTINCT job_locations.job_id) AS count
         FROM job_locations
         JOIN job_postings ON job_postings.id = job_locations.job_id
         WHERE job_postings.status = 'published'
           AND job_locations.version_id = job_postings.current_version_id
           AND job_locations.city_name IS NOT NULL
           AND job_locations.country_code IS NOT NULL
         GROUP BY job_locations.country_code, job_locations.city_name
         ORDER BY code ASC, name ASC
         LIMIT 1000`,
      ).all<CityFilterRow>(),
    ]);

    const locations = new Map<string, {
      code: string; name: string; count: number;
      cities: Map<string, { slug: string; name: string; count: number }>;
    }>();
    for (const item of countries.results) {
      locations.set(item.code, { code: item.code, name: item.name, count: Number(item.count), cities: new Map() });
    }
    for (const item of cities.results) {
      const countryEntry = locations.get(item.code);
      if (!countryEntry) continue;
      if (isRegionOnlyLocation(item.code, item.name)) continue;
      const slug = citySlugFor(item.code, item.name);
      const existing = countryEntry.cities.get(slug);
      countryEntry.cities.set(slug, {
        slug,
        name: existing?.name ?? item.name,
        count: (existing?.count ?? 0) + Number(item.count),
      });
    }

    return json({
      jobs: jobs.results.map((job) => ({
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
        bookmarked: Boolean(job.bookmarked),
      })),
      pagination: {
        limit,
        offset,
        total: Number(total?.total ?? 0),
        nextOffset: offset + jobs.results.length < Number(total?.total ?? 0) ? offset + jobs.results.length : null,
      },
      stats: {
        publishedJobs: Number(stats?.published_jobs ?? 0),
        companies: Number(stats?.companies ?? 0),
        mappedJobs: Number(stats?.mapped_jobs ?? 0),
        latestPublishedAt: stats?.published_at ?? null,
      },
      filters: {
        countries: countries.results.map((item) => ({ code: item.code, name: item.name, count: Number(item.count) })),
        cities: cities.results.map((item) => ({ slug: citySlugFor(item.code, item.name), name: item.name, count: Number(item.count) })),
        locations: [...locations.values()].map((countryEntry) => ({
          code: countryEntry.code,
          name: countryEntry.name,
          count: countryEntry.count,
          cities: [...countryEntry.cities.values()].sort((left, right) => left.name.localeCompare(right.name)),
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
