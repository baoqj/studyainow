-- JD source text is stored in D1 job_versions.normalized_json and in the
-- current job_sections.public_text. Existing configured sources now retain
-- and display the complete source-language JD rather than an excerpt.
UPDATE job_sources
SET display_policy = 'full_text_authorized'
WHERE display_policy = 'excerpt';

-- Every enabled official API source is due twice per day. Make the next Cron
-- pass pick up already-configured sources promptly after this migration.
UPDATE job_sources
SET polling_minutes = 720,
    next_fetch_at = CURRENT_TIMESTAMP
WHERE enabled = 1
  AND acquisition_policy = 'api_allowed';
