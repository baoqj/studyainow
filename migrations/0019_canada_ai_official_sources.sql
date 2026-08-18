-- Canada expansion: Cohere's official public careers page links to its public
-- Ashby job board. The feed is fetched directly from the documented board
-- endpoint, not from a search engine or third-party aggregator. It remains
-- subject to the same source-language, safe-rich-text and twice-daily update
-- pipeline as all existing official ATS sources.
INSERT OR IGNORE INTO companies (id, slug, name, official_website, career_url, status)
VALUES (
  'company_cohere',
  'cohere',
  'Cohere',
  'https://cohere.com/',
  'https://cohere.com/careers',
  'active'
);

INSERT OR IGNORE INTO job_sources
  (id, company_id, source_type, board_token, official_career_url, endpoint_url, acquisition_policy,
   display_policy, terms_url, policy_reviewed_at, polling_minutes, next_fetch_at, enabled)
VALUES (
  'source_cohere_ashby',
  'company_cohere',
  'ashby',
  'cohere',
  'https://cohere.com/careers',
  'https://api.ashbyhq.com/posting-api/job-board/cohere?includeCompensation=false',
  'api_allowed',
  'full_text_authorized',
  'https://cohere.com/terms-of-use',
  CURRENT_TIMESTAMP,
  720,
  CURRENT_TIMESTAMP,
  1
);
