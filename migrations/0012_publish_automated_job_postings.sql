-- Official Greenhouse, Lever and Ashby sources are acquired directly from the
-- employer's ATS. Publish their existing records so the public /jobs page
-- reflects the automatic job feed; manually added sources retain review gates.
INSERT INTO job_status_events (id, job_id, from_status, to_status, reason)
SELECT lower(hex(randomblob(16))), job_postings.id, 'needs_review', 'published',
       'Published existing official ATS job feed after public listing launch'
FROM job_postings
JOIN job_sources ON job_sources.id = job_postings.source_id
WHERE job_postings.status = 'needs_review' AND job_sources.acquisition_policy = 'api_allowed';

UPDATE job_postings
SET status = 'published', updated_at = CURRENT_TIMESTAMP
WHERE status = 'needs_review'
  AND EXISTS (
    SELECT 1 FROM job_sources
    WHERE job_sources.id = job_postings.source_id
      AND job_sources.acquisition_policy = 'api_allowed'
  );

UPDATE job_skill_evidence
SET review_status = 'approved'
WHERE review_status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM job_postings
    JOIN job_sources ON job_sources.id = job_postings.source_id
    WHERE job_postings.id = job_skill_evidence.job_id
      AND job_postings.current_version_id = job_skill_evidence.version_id
      AND job_postings.status = 'published'
      AND job_sources.acquisition_policy = 'api_allowed'
  );
