-- A job may be eligible in more than one country/city. Geography is versioned
-- alongside the acquired JD so automatic source updates remain auditable.
CREATE TABLE IF NOT EXISTS job_locations (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  raw_location_text TEXT NOT NULL,
  country_code TEXT,
  country_name TEXT,
  region_name TEXT,
  city_name TEXT,
  is_remote INTEGER NOT NULL DEFAULT 0 CHECK (is_remote IN (0, 1)),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  source_method TEXT NOT NULL CHECK (source_method IN ('structured_source', 'location_text', 'admin_review')),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES job_versions(id) ON DELETE CASCADE,
  UNIQUE (version_id, raw_location_text)
);

CREATE INDEX IF NOT EXISTS job_locations_job_version_idx
  ON job_locations(job_id, version_id, is_primary);
CREATE INDEX IF NOT EXISTS job_locations_country_city_idx
  ON job_locations(country_code, city_name, job_id);
