PRAGMA foreign_keys = ON;

INSERT INTO news_source (
  id, name, base_url, source_type, trust_tier, language,
  schedule_cron, parser_key, terms_note, full_text_authorized, status
) VALUES
  ('openai-news', 'OpenAI News', 'https://openai.com/news/', 'rss', 'A', 'en', '*/30 * * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('google-deepmind', 'Google DeepMind Blog', 'https://deepmind.google/blog/', 'rss', 'A', 'en', '0 * * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('google-ai', 'Google AI Blog', 'https://blog.google/innovation-and-ai/technology/ai/', 'rss', 'A', 'en', '0 * * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('google-research', 'Google Research Blog', 'https://research.google/blog/', 'rss', 'A', 'en', '0 */2 * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('microsoft-research', 'Microsoft Research Blog', 'https://www.microsoft.com/en-us/research/blog/', 'rss', 'A', 'en', '0 */2 * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('cloudflare-blog', 'Cloudflare Blog', 'https://blog.cloudflare.com/', 'rss', 'A', 'en', '0 * * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('nvidia-technical-blog', 'NVIDIA Technical Blog', 'https://developer.nvidia.com/blog/', 'atom', 'A', 'en', '0 * * * *', 'rss_atom_v1', 'Official public Atom feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('aws-machine-learning', 'AWS Machine Learning Blog', 'https://aws.amazon.com/blogs/machine-learning/', 'rss', 'A', 'en', '0 * * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('github-ai-ml', 'GitHub AI and ML Blog', 'https://github.blog/ai-and-ml/', 'rss', 'A', 'en', '0 * * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active'),
  ('apple-machine-learning', 'Apple Machine Learning Research', 'https://machinelearning.apple.com/', 'rss', 'A', 'en', '0 */2 * * *', 'rss_atom_v1', 'Official public RSS feed; robots allowed 2026-09-03; private feed snapshot and metadata/short summary only; no public full-text redistribution.', 0, 'active');

INSERT INTO source_ingestion_policy (
  source_id, fetch_url, allowed_hosts_json, policy_status, robots_status,
  allow_html_fetch, max_response_bytes, max_items_per_poll,
  min_poll_interval_seconds, retention_policy, policy_reviewed_at,
  next_policy_review_at
) VALUES
  ('openai-news', 'https://openai.com/news/rss.xml', '["openai.com"]', 'approved', 'allowed', 0, 1048576, 20, 1800, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('google-deepmind', 'https://deepmind.google/blog/rss.xml', '["deepmind.google"]', 'approved', 'allowed', 0, 1048576, 20, 3600, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('google-ai', 'https://blog.google/innovation-and-ai/technology/ai/rss/', '["blog.google"]', 'approved', 'allowed', 0, 1048576, 20, 3600, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('google-research', 'https://research.google/blog/rss/', '["research.google"]', 'approved', 'allowed', 0, 1048576, 20, 7200, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('microsoft-research', 'https://www.microsoft.com/en-us/research/feed/', '["www.microsoft.com"]', 'approved', 'allowed', 0, 1048576, 20, 7200, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('cloudflare-blog', 'https://blog.cloudflare.com/rss/', '["blog.cloudflare.com"]', 'approved', 'allowed', 0, 1048576, 20, 3600, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('nvidia-technical-blog', 'https://developer.nvidia.com/blog/feed/', '["developer.nvidia.com"]', 'approved', 'allowed', 0, 1048576, 20, 3600, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('aws-machine-learning', 'https://aws.amazon.com/blogs/machine-learning/feed/', '["aws.amazon.com"]', 'approved', 'allowed', 0, 1048576, 20, 3600, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('github-ai-ml', 'https://github.blog/ai-and-ml/feed/', '["github.blog"]', 'approved', 'allowed', 0, 1048576, 20, 3600, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z'),
  ('apple-machine-learning', 'https://machinelearning.apple.com/rss.xml', '["machinelearning.apple.com"]', 'approved', 'allowed', 0, 1048576, 20, 7200, 'private_feed_snapshot', '2026-09-03T00:00:00.000Z', '2026-12-03T00:00:00.000Z');

INSERT INTO source_cursor (id, source_id, cursor_key)
SELECT 'cursor:' || id, id, 'main'
FROM news_source
WHERE id IN (
  'openai-news',
  'google-deepmind',
  'google-ai',
  'google-research',
  'microsoft-research',
  'cloudflare-blog',
  'nvidia-technical-blog',
  'aws-machine-learning',
  'github-ai-ml',
  'apple-machine-learning'
);

UPDATE schema_metadata
SET value = '4', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'news_schema_version';
