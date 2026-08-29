CREATE TABLE IF NOT EXISTS llm_usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  operation TEXT NOT NULL DEFAULT 'chat_completion',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  item_type TEXT,
  item_id TEXT,
  item_label TEXT,
  route TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  estimated INTEGER NOT NULL DEFAULT 0 CHECK (estimated IN (0, 1)),
  input_characters INTEGER NOT NULL DEFAULT 0 CHECK (input_characters >= 0),
  output_characters INTEGER NOT NULL DEFAULT 0 CHECK (output_characters >= 0),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 1),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at ON llm_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_created ON llm_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_feature_created ON llm_usage_events(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_provider_model_created ON llm_usage_events(provider, model, created_at DESC);
