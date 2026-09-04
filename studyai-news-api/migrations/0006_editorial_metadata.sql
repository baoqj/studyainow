PRAGMA foreign_keys = ON;

INSERT INTO article_status_transition
  (from_status, to_status, requires_human_approval, description)
VALUES
  ('withdrawn', 'draft', 0, 'Reopen withdrawn content for a new editorial cycle');

ALTER TABLE source_item ADD COLUMN simhash_hex TEXT;
ALTER TABLE source_item ADD COLUMN dedupe_version TEXT;
ALTER TABLE article_revision ADD COLUMN slug TEXT;

CREATE INDEX idx_source_item_simhash
  ON source_item (simhash_hex, published_at DESC);

CREATE TABLE story_metadata_revision (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  primary_category_id TEXT REFERENCES taxonomy_node(id) ON DELETE RESTRICT,
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  entities_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(entities_json)),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  classifier_version TEXT NOT NULL,
  change_source TEXT NOT NULL CHECK (change_source IN ('automatic', 'human')),
  actor_ref TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (story_id, revision_number)
) STRICT;

CREATE INDEX idx_story_metadata_revision_story_created
  ON story_metadata_revision (story_id, created_at DESC);

CREATE TABLE story_taxonomy (
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE CASCADE,
  taxonomy_id TEXT NOT NULL REFERENCES taxonomy_node(id) ON DELETE RESTRICT,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('primary', 'tag')),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 1000),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  source_version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (story_id, taxonomy_id, relation_type)
) STRICT;

CREATE UNIQUE INDEX idx_story_taxonomy_one_primary
  ON story_taxonomy (story_id)
  WHERE relation_type = 'primary';

CREATE TABLE story_entity (
  story_id TEXT NOT NULL REFERENCES story_cluster(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entity(id) ON DELETE RESTRICT,
  evidence_excerpt TEXT NOT NULL CHECK (length(evidence_excerpt) <= 1000),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  source_version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (story_id, entity_id)
) STRICT;

CREATE TRIGGER story_metadata_revision_immutable_update
BEFORE UPDATE ON story_metadata_revision
BEGIN
  SELECT RAISE(ABORT, 'story metadata revisions are immutable');
END;

CREATE TRIGGER story_metadata_revision_immutable_delete
BEFORE DELETE ON story_metadata_revision
BEGIN
  SELECT RAISE(ABORT, 'story metadata revisions are immutable');
END;

CREATE TRIGGER story_taxonomy_type_guard_insert
BEFORE INSERT ON story_taxonomy
WHEN NOT EXISTS (
  SELECT 1 FROM taxonomy_node
  WHERE id = NEW.taxonomy_id
    AND status = 'active'
    AND (
      (NEW.relation_type = 'primary' AND taxonomy_type = 'category')
      OR (NEW.relation_type = 'tag' AND taxonomy_type = 'tag')
    )
)
BEGIN
  SELECT RAISE(ABORT, 'story taxonomy type mismatch');
END;

CREATE TRIGGER story_taxonomy_type_guard_update
BEFORE UPDATE OF taxonomy_id, relation_type ON story_taxonomy
WHEN NOT EXISTS (
  SELECT 1 FROM taxonomy_node
  WHERE id = NEW.taxonomy_id
    AND status = 'active'
    AND (
      (NEW.relation_type = 'primary' AND taxonomy_type = 'category')
      OR (NEW.relation_type = 'tag' AND taxonomy_type = 'tag')
    )
)
BEGIN
  SELECT RAISE(ABORT, 'story taxonomy type mismatch');
END;

INSERT INTO taxonomy_node
  (id, taxonomy_type, locale, slug, name, aliases_json, status, locked)
VALUES
  ('category:model-research', 'category', 'zh-CN', 'model-research', '模型与研究', '["research","paper","model","benchmark"]', 'active', 1),
  ('category:products-tools', 'category', 'zh-CN', 'products-tools', 'AI 产品与工具', '["product","tool","assistant","agent"]', 'active', 1),
  ('category:development-infrastructure', 'category', 'zh-CN', 'development-infrastructure', '开发与基础设施', '["developer","infrastructure","cloud","api","sdk"]', 'active', 1),
  ('category:business-funding', 'category', 'zh-CN', 'business-funding', '商业与投融资', '["business","funding","investment","revenue"]', 'active', 1),
  ('category:policy-governance', 'category', 'zh-CN', 'policy-governance', '政策与治理', '["policy","regulation","governance","safety"]', 'active', 1),
  ('category:open-source', 'category', 'zh-CN', 'open-source', '开源项目', '["open source","github","repository","release"]', 'active', 1),
  ('category:industry-applications', 'category', 'zh-CN', 'industry-applications', '行业应用', '["healthcare","finance","manufacturing","enterprise"]', 'active', 1),
  ('category:education-careers', 'category', 'zh-CN', 'education-careers', '教育与职业', '["education","learning","career","job","course"]', 'active', 1);

INSERT INTO taxonomy_node
  (id, taxonomy_type, locale, slug, name, aliases_json, status, locked)
VALUES
  ('tag:agents', 'tag', 'zh-CN', 'agents', 'AI Agents', '["agent","agentic"]', 'active', 0),
  ('tag:api', 'tag', 'zh-CN', 'api', 'API', '["apis","sdk"]', 'active', 0),
  ('tag:benchmark', 'tag', 'zh-CN', 'benchmark', '基准测试', '["eval","evaluation","benchmark"]', 'active', 0),
  ('tag:developer-tools', 'tag', 'zh-CN', 'developer-tools', '开发者工具', '["developer tool","coding"]', 'active', 0),
  ('tag:funding', 'tag', 'zh-CN', 'funding', '投融资', '["funding","investment","valuation"]', 'active', 0),
  ('tag:generative-ai', 'tag', 'zh-CN', 'generative-ai', '生成式 AI', '["generative ai","genai"]', 'active', 0),
  ('tag:governance', 'tag', 'zh-CN', 'governance', 'AI 治理', '["governance","regulation","policy"]', 'active', 0),
  ('tag:large-language-models', 'tag', 'zh-CN', 'large-language-models', '大语言模型', '["llm","large language model"]', 'active', 0),
  ('tag:multimodal', 'tag', 'zh-CN', 'multimodal', '多模态', '["multimodal","vision language"]', 'active', 0),
  ('tag:open-source', 'tag', 'zh-CN', 'open-source', '开源', '["open source","open-source"]', 'active', 0),
  ('tag:research', 'tag', 'zh-CN', 'research', '研究', '["research","paper","study"]', 'active', 0),
  ('tag:safety', 'tag', 'zh-CN', 'safety', 'AI 安全', '["safety","alignment","risk"]', 'active', 0);

INSERT INTO entity
  (id, entity_type, canonical_name, aliases_json, external_refs_json, status)
VALUES
  ('entity:openai', 'organization', 'OpenAI', '["Open AI"]', '{}', 'active'),
  ('entity:anthropic', 'organization', 'Anthropic', '["Claude"]', '{}', 'active'),
  ('entity:google-deepmind', 'organization', 'Google DeepMind', '["DeepMind","Google AI","Gemini"]', '{}', 'active'),
  ('entity:meta-ai', 'organization', 'Meta AI', '["Meta","Llama"]', '{}', 'active'),
  ('entity:microsoft', 'organization', 'Microsoft', '["Microsoft AI","Azure AI"]', '{}', 'active'),
  ('entity:apple', 'organization', 'Apple', '["Apple Intelligence"]', '{}', 'active'),
  ('entity:hugging-face', 'organization', 'Hugging Face', '["HuggingFace"]', '{}', 'active'),
  ('entity:aws', 'organization', 'Amazon Web Services', '["AWS","Amazon Bedrock"]', '{}', 'active');

UPDATE schema_metadata
SET value = '6', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'news_schema_version';
