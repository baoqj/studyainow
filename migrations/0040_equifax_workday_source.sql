-- Equifax's branded careers site is protected by an interactive Cloudflare
-- challenge, but every posting links to the company's official public Workday
-- tenant. Register that structured employer source for the existing twice-
-- daily acquisition, semantic analysis, tag normalization, and vector flow.

INSERT OR IGNORE INTO companies
  (id, slug, name, official_website, career_url, status)
VALUES
  ('company_equifax', 'equifax', 'Equifax', 'https://www.equifax.com/', 'https://careers.equifax.com/en/jobs/', 'active');

INSERT OR IGNORE INTO job_sources
  (id, company_id, source_type, board_token, official_career_url, endpoint_url,
   acquisition_policy, display_policy, terms_url, policy_reviewed_at,
   polling_minutes, max_requests_per_minute, next_fetch_at, enabled)
VALUES
  ('source_equifax_workday', 'company_equifax', 'json_ld', 'equifax-workday',
   'https://careers.equifax.com/en/jobs/',
   'https://equifax.wd5.myworkdayjobs.com/wday/cxs/equifax/External/jobs',
   'structured_data', 'excerpt', 'https://www.equifax.com/terms/', CURRENT_TIMESTAMP,
   720, 60, CURRENT_TIMESTAMP, 1);
