-- Public presentation is derived from an immutable normalized job version.
-- Track its renderer independently so policy changes can be applied without
-- recrawling, re-running semantic analysis, or replacing vector embeddings.
ALTER TABLE job_postings ADD COLUMN presentation_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE job_postings ADD COLUMN presentation_hash TEXT;
ALTER TABLE job_postings ADD COLUMN presentation_lock_until TEXT;
ALTER TABLE job_postings ADD COLUMN presentation_error TEXT;

CREATE INDEX IF NOT EXISTS job_postings_presentation_queue_idx
  ON job_postings(status, presentation_version, presentation_lock_until, id);

-- Databricks serves the complete source-language JD through its official
-- Greenhouse API and canonical careers page. Publish a bounded source excerpt;
-- the complete text remains private analysis input and is never translated.
UPDATE job_sources
SET display_policy = 'excerpt', policy_reviewed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'source_databricks_greenhouse';

-- Prioritize the reported role in the resumable refresh queue, then process
-- the rest of the catalogue in bounded two-minute maintenance batches.
UPDATE job_postings
SET presentation_version = -1
WHERE source_id = 'source_databricks_greenhouse'
  AND external_job_id = '8747605002';

-- Reuse a confirmed same-site redirect as the canonical public/apply URL.
-- original_source_url remains immutable for lifecycle audit and inspection.
UPDATE job_postings
SET source_url = (
      SELECT job_url_inspections.final_url
      FROM job_url_inspections
      WHERE job_url_inspections.job_id = job_postings.id
        AND job_url_inspections.outcome = 'active'
        AND (
          lower(job_url_inspections.final_url) LIKE 'https://databricks.com/%'
          OR lower(job_url_inspections.final_url) LIKE 'https://%.databricks.com/%'
        )
      ORDER BY job_url_inspections.checked_at DESC
      LIMIT 1
    ),
    apply_url = (
      SELECT job_url_inspections.final_url
      FROM job_url_inspections
      WHERE job_url_inspections.job_id = job_postings.id
        AND job_url_inspections.outcome = 'active'
        AND (
          lower(job_url_inspections.final_url) LIKE 'https://databricks.com/%'
          OR lower(job_url_inspections.final_url) LIKE 'https://%.databricks.com/%'
        )
      ORDER BY job_url_inspections.checked_at DESC
      LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE source_id = 'source_databricks_greenhouse'
  AND EXISTS (
    SELECT 1 FROM job_url_inspections
    WHERE job_url_inspections.job_id = job_postings.id
      AND job_url_inspections.outcome = 'active'
      AND (
        lower(job_url_inspections.final_url) LIKE 'https://databricks.com/%'
        OR lower(job_url_inspections.final_url) LIKE 'https://%.databricks.com/%'
      )
  );
