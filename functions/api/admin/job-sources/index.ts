import { requireAdmin } from '../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../_lib/http';
import { sourceInputFromRequest, sourcePolicy, normalizeSlug } from '../../../_lib/jobs';

type SourcePayload = Record<string, unknown> & { companyName?: unknown; companySlug?: unknown; sourceType?: unknown; boardToken?: unknown; officialCareerUrl?: unknown; displayPolicy?: unknown; termsUrl?: unknown };

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(env.DB, request);
    const sources = await env.DB.prepare(
      `SELECT job_sources.id, job_sources.source_type, job_sources.board_token, job_sources.official_career_url,
              job_sources.endpoint_url, job_sources.acquisition_policy, job_sources.display_policy, job_sources.enabled,
              job_sources.polling_minutes, job_sources.last_fetched_at, job_sources.next_fetch_at,
              job_sources.consecutive_failures, job_sources.terms_url, job_sources.updated_at,
              companies.id AS company_id, companies.name AS company_name, companies.slug AS company_slug,
              (SELECT crawl_runs.status FROM crawl_runs WHERE crawl_runs.source_id = job_sources.id
                ORDER BY crawl_runs.started_at DESC LIMIT 1) AS last_run_status,
              (SELECT COUNT(*) FROM job_postings WHERE job_postings.source_id = job_sources.id) AS job_count
       FROM job_sources JOIN companies ON companies.id = job_sources.company_id
       ORDER BY companies.name, job_sources.created_at DESC`,
    ).all();
    return json({ sources: sources.results });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const admin = await requireAdmin(env.DB, request);
    const input = await readJson<SourcePayload>(request);
    const companyName = requireString(input.companyName, 'companyName');
    const companySlug = normalizeSlug(typeof input.companySlug === 'string' ? input.companySlug : companyName);
    const source = sourceInputFromRequest(input);
    const termsUrl = typeof input.termsUrl === 'string' && input.termsUrl.trim() ? input.termsUrl.trim() : null;
    if (termsUrl && !/^https:\/\//i.test(termsUrl)) throw new ApiError(400, 'termsUrl must use HTTPS');

    let company = await env.DB.prepare('SELECT id FROM companies WHERE slug = ?').bind(companySlug).first<{ id: string }>();
    const companyIsNew = !company;
    if (!company) company = { id: crypto.randomUUID() };
    const existing = await env.DB.prepare(
      'SELECT id FROM job_sources WHERE company_id = ? AND source_type = ? AND board_token = ?',
    ).bind(company.id, source.sourceType, source.boardToken).first<{ id: string }>();
    if (existing) return json({ error: 'This company ATS source already exists', sourceId: existing.id }, { status: 409 });

    const sourceId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [];
    if (companyIsNew) {
      statements.push(env.DB.prepare(
        `INSERT INTO companies (id, slug, name, career_url) VALUES (?, ?, ?, ?)`,
      ).bind(company.id, companySlug, companyName, source.officialCareerUrl));
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO job_sources
         (id, company_id, source_type, board_token, official_career_url, endpoint_url, acquisition_policy, display_policy,
          terms_url, policy_reviewed_at, polling_minutes, next_fetch_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP)`,
      ).bind(
        sourceId, company.id, source.sourceType, source.boardToken, source.officialCareerUrl, source.endpointUrl,
        sourcePolicy(source.sourceType), source.displayPolicy, termsUrl,
      ),
      env.DB.prepare(
        `INSERT INTO admin_audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json)
         VALUES (?, ?, 'job_source.created', 'job_source', ?, ?)`,
      ).bind(crypto.randomUUID(), admin.id, sourceId, JSON.stringify({ companyName, sourceType: source.sourceType })),
    );
    try {
      await env.DB.batch(statements);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new ApiError(409, 'This company or ATS source already exists');
      }
      throw error;
    }
    return json({ sourceId, companyId: company.id, syncStatus: 'ready_for_manual_sync' }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
