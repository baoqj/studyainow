PRAGMA foreign_keys = ON;

ALTER TABLE source_cursor ADD COLUMN last_parser_version TEXT;
ALTER TABLE source_fetch_run ADD COLUMN parser_version TEXT;

UPDATE news_source
SET parser_key = 'rss_atom_v2',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE parser_key = 'rss_atom_v1';

-- Force one full conditional-free fetch after a parser upgrade. The previous
-- content hash remains available so the Worker can reuse the immutable R2
-- snapshot while safely rebuilding normalized D1 fields.
UPDATE source_cursor
SET etag = NULL,
    last_modified = NULL,
    last_checked_at = NULL,
    next_allowed_at = NULL,
    last_parser_version = NULL,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE source_id IN (
  SELECT id FROM news_source WHERE parser_key = 'rss_atom_v2'
);

UPDATE schema_metadata
SET value = '5', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'news_schema_version';
