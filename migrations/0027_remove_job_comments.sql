PRAGMA foreign_keys = ON;

-- Job listings are intentionally read-only. Remove the retired public
-- discussion data and its indexes from every D1 environment.
DROP TABLE IF EXISTS job_comments;
