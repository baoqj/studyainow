-- Backfill the small set of legacy current versions that used an unambiguous
-- United States state abbreviation or Dublin, IE before geography parsing was
-- added. The source location stays unchanged; this only adds a canonical
-- location record used by public country/city filtering.
INSERT INTO job_locations
  (id, job_id, version_id, raw_location_text, country_code, country_name,
   region_name, city_name, is_remote, confidence, source_method, is_primary)
SELECT
  lower(hex(randomblob(16))),
  job_postings.id,
  job_postings.current_version_id,
  'Canonical geography backfill: ' || job_postings.location_text,
  CASE WHEN job_postings.location_text LIKE '%Dublin, IE%' THEN 'IE' ELSE 'US' END,
  CASE WHEN job_postings.location_text LIKE '%Dublin, IE%' THEN 'Ireland' ELSE 'United States' END,
  CASE
    WHEN job_postings.location_text LIKE '%Dublin, IE%' THEN NULL
    WHEN job_postings.location_text LIKE '%New York City, NY%' THEN 'New York'
    WHEN job_postings.location_text LIKE '%Washington, DC%' THEN 'District of Columbia'
    WHEN job_postings.location_text LIKE '%Seattle, WA%' THEN 'Washington'
    WHEN job_postings.location_text LIKE '%San Francisco, CA%' THEN 'California'
    ELSE NULL
  END,
  CASE
    WHEN job_postings.location_text LIKE '%Dublin, IE%' THEN 'Dublin'
    WHEN job_postings.location_text LIKE '%New York City, NY%' THEN 'New York City'
    WHEN job_postings.location_text LIKE '%Washington, DC%' THEN 'Washington'
    WHEN job_postings.location_text LIKE '%Seattle, WA%' THEN 'Seattle'
    WHEN job_postings.location_text LIKE '%San Francisco, CA%' THEN 'San Francisco'
    ELSE NULL
  END,
  CASE WHEN job_postings.location_text LIKE 'Remote-Friendly US%' THEN 1 ELSE 0 END,
  0.82,
  'location_text',
  0
FROM job_postings
WHERE job_postings.status = 'published'
  AND job_postings.location_text IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM job_locations
    WHERE job_locations.job_id = job_postings.id
      AND job_locations.version_id = job_postings.current_version_id
      AND job_locations.country_code IS NOT NULL
  )
  AND (
    job_postings.location_text LIKE '%Dublin, IE%'
    OR job_postings.location_text LIKE '%San Francisco, CA%'
    OR job_postings.location_text LIKE '%New York City, NY%'
    OR job_postings.location_text LIKE '%Seattle, WA%'
    OR job_postings.location_text LIKE '%Washington, DC%'
    OR job_postings.location_text LIKE '%Remote-Friendly US%'
  );
