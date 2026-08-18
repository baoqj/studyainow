PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  official_website TEXT,
  career_url TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_sources (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('greenhouse', 'lever', 'ashby', 'json_ld', 'manual')),
  board_token TEXT,
  official_career_url TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  acquisition_policy TEXT NOT NULL CHECK (acquisition_policy IN ('api_allowed', 'structured_data', 'manual_only')),
  display_policy TEXT NOT NULL CHECK (display_policy IN ('metadata_only', 'excerpt', 'full_text_authorized')),
  terms_url TEXT,
  policy_reviewed_at TEXT,
  polling_minutes INTEGER NOT NULL DEFAULT 1440 CHECK (polling_minutes >= 15),
  max_requests_per_minute INTEGER NOT NULL DEFAULT 6 CHECK (max_requests_per_minute >= 1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_fetched_at TEXT,
  next_fetch_at TEXT,
  sync_lock_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_sources_schedule_idx ON job_sources(enabled, next_fetch_at);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'complete_success', 'complete_error', 'rate_limited')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  http_status INTEGER,
  discovered_count INTEGER NOT NULL DEFAULT 0,
  relevant_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  stats_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS crawl_runs_source_started_idx ON crawl_runs(source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS raw_job_snapshots (
  id TEXT PRIMARY KEY,
  crawl_run_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  content_sha256 TEXT NOT NULL,
  content_type TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  http_status INTEGER NOT NULL,
  etag TEXT,
  last_modified TEXT,
  FOREIGN KEY (crawl_run_id) REFERENCES crawl_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  external_job_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  canonical_key TEXT NOT NULL,
  title TEXT NOT NULL,
  normalized_title TEXT,
  location_text TEXT,
  remote_type TEXT NOT NULL DEFAULT 'unknown' CHECK (remote_type IN ('remote', 'hybrid', 'on_site', 'unknown')),
  employment_type TEXT,
  function_category TEXT,
  seniority TEXT,
  source_url TEXT NOT NULL,
  apply_url TEXT,
  source_attribution TEXT NOT NULL,
  display_policy TEXT NOT NULL CHECK (display_policy IN ('metadata_only', 'excerpt', 'full_text_authorized')),
  source_published_at TEXT,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  current_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('draft', 'normalized', 'needs_review', 'approved', 'published', 'possibly_expired', 'expired', 'closed', 'archived', 'rejected')),
  missing_run_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_id, external_job_id),
  UNIQUE (source_id, canonical_key),
  FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_postings_public_idx ON job_postings(status, last_verified_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS job_postings_company_idx ON job_postings(company_id, status);

CREATE TABLE IF NOT EXISTS job_versions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  snapshot_id TEXT,
  version_no INTEGER NOT NULL,
  semantic_hash TEXT NOT NULL,
  normalized_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (job_id, version_no),
  UNIQUE (job_id, semantic_hash),
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (snapshot_id) REFERENCES raw_job_snapshots(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_sections (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  title TEXT,
  public_text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  UNIQUE (version_id, section_key),
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES job_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_sections_job_order_idx ON job_sections(job_id, order_index);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  taxonomy_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES skills(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS skill_aliases (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  match_type TEXT NOT NULL DEFAULT 'word' CHECK (match_type IN ('word', 'phrase')),
  exclusion_context_json TEXT NOT NULL DEFAULT '[]',
  UNIQUE (skill_id, alias),
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS skill_aliases_alias_idx ON skill_aliases(alias);

CREATE TABLE IF NOT EXISTS lesson_skill_coverage (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  chapter_route_id TEXT NOT NULL,
  lesson_route_id TEXT,
  coverage_level TEXT NOT NULL CHECK (coverage_level IN ('intro', 'practice', 'advanced')),
  coverage_score INTEGER NOT NULL CHECK (coverage_score BETWEEN 0 AND 100),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  learning_outcome TEXT NOT NULL,
  evidence TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (skill_id, course_id, chapter_route_id, lesson_route_id),
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS lesson_skill_coverage_skill_idx ON lesson_skill_coverage(skill_id, review_status, coverage_score DESC);

CREATE TABLE IF NOT EXISTS job_skill_evidence (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  evidence_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL CHECK (start_offset >= 0),
  end_offset INTEGER NOT NULL CHECK (end_offset > start_offset),
  requirement_level TEXT NOT NULL DEFAULT 'required' CHECK (requirement_level IN ('required', 'preferred', 'responsibility', 'context')),
  evidence_type TEXT NOT NULL DEFAULT 'explicit' CHECK (evidence_type IN ('explicit', 'implicit')),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  explanation TEXT NOT NULL,
  source_method TEXT NOT NULL DEFAULT 'dictionary_rule',
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'edited', 'stale')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES job_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES job_sections(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_skill_evidence_job_idx ON job_skill_evidence(job_id, review_status);
CREATE INDEX IF NOT EXISTS job_skill_evidence_skill_idx ON job_skill_evidence(skill_id, review_status);

CREATE TABLE IF NOT EXISTS job_reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_correction', 'archived')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS job_status_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO skills (id, slug, name_zh, name_en, definition, category, difficulty, status)
VALUES
  ('skill_agentic_workflows', 'agentic-workflows', '智能体工作流设计', 'Agentic workflow design', 'Design goal-plan-act-verify loops, tool orchestration, and reliable agent workflows.', 'Agent engineering', 'intermediate', 'approved'),
  ('skill_context_engineering', 'context-engineering', '上下文工程', 'Context engineering', 'Shape durable project context, instructions, memory, and context-window use for AI systems.', 'LLM application engineering', 'intermediate', 'approved'),
  ('skill_ai_safety', 'ai-safety-guardrails', 'AI 安全与权限边界', 'AI safety and guardrails', 'Define permissions, review gates, and safe execution boundaries for AI-enabled systems.', 'Evaluation and safety', 'intermediate', 'approved'),
  ('skill_evaluation', 'model-evaluation', '模型评测与回归验证', 'Model evaluation and regression testing', 'Build evaluation criteria, test harnesses, and repeatable validation for AI behaviour.', 'Evaluation and safety', 'advanced', 'approved'),
  ('skill_mcp_tools', 'mcp-tool-integration', 'MCP 与工具集成', 'MCP and tool integration', 'Connect AI systems to external tools with explicit capabilities and authentication boundaries.', 'Agent engineering', 'intermediate', 'approved'),
  ('skill_agent_skills', 'agent-skills-and-subagents', '技能与子智能体设计', 'Agent skills and subagents', 'Choose reusable skills, subagents, and plugin boundaries for multi-agent systems.', 'Agent engineering', 'advanced', 'approved'),
  ('skill_rag', 'rag-knowledge-retrieval', 'RAG 与知识检索', 'RAG and knowledge retrieval', 'Build grounded retrieval, knowledge-base, and memory workflows for AI applications.', 'Data and knowledge engineering', 'intermediate', 'approved');

INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type)
VALUES
  ('alias_agentic', 'skill_agentic_workflows', 'agentic workflow', 'en', 'phrase'),
  ('alias_agentic_plural', 'skill_agentic_workflows', 'agentic workflows', 'en', 'phrase'),
  ('alias_multi_agent', 'skill_agentic_workflows', 'multi-agent', 'en', 'phrase'),
  ('alias_agent_system', 'skill_agentic_workflows', 'agent system', 'en', 'phrase'),
  ('alias_context_engineering', 'skill_context_engineering', 'context engineering', 'en', 'phrase'),
  ('alias_context_window', 'skill_context_engineering', 'context window', 'en', 'phrase'),
  ('alias_memory', 'skill_context_engineering', 'conversation memory', 'en', 'phrase'),
  ('alias_guardrails', 'skill_ai_safety', 'guardrails', 'en', 'word'),
  ('alias_sandbox', 'skill_ai_safety', 'sandbox', 'en', 'word'),
  ('alias_permissions', 'skill_ai_safety', 'permissions', 'en', 'word'),
  ('alias_eval', 'skill_evaluation', 'evaluation harness', 'en', 'phrase'),
  ('alias_evals', 'skill_evaluation', 'evals', 'en', 'word'),
  ('alias_regression', 'skill_evaluation', 'regression testing', 'en', 'phrase'),
  ('alias_mcp', 'skill_mcp_tools', 'MCP', 'en', 'word'),
  ('alias_tool_use', 'skill_mcp_tools', 'tool use', 'en', 'phrase'),
  ('alias_tool_calling', 'skill_mcp_tools', 'tool calling', 'en', 'phrase'),
  ('alias_subagent', 'skill_agent_skills', 'subagent', 'en', 'word'),
  ('alias_subagents', 'skill_agent_skills', 'subagents', 'en', 'word'),
  ('alias_agent_skills', 'skill_agent_skills', 'agent skills', 'en', 'phrase'),
  ('alias_rag', 'skill_rag', 'RAG', 'en', 'word'),
  ('alias_retrieval', 'skill_rag', 'retrieval augmented generation', 'en', 'phrase'),
  ('alias_vector', 'skill_rag', 'vector database', 'en', 'phrase');

INSERT OR IGNORE INTO lesson_skill_coverage (id, skill_id, course_id, chapter_route_id, lesson_route_id, coverage_level, coverage_score, is_primary, learning_outcome, evidence, review_status)
VALUES
  ('coverage_agentic_claude', 'skill_agentic_workflows', 'claude-code-guide', '3', '03-02', 'practice', 94, 1, 'Turn a goal into a planned and verifiable agent task.', 'Agentic Loop chapter: require a plan before execution.', 'approved'),
  ('coverage_agentic_codex', 'skill_agentic_workflows', 'codex-tutorial', '4', '04-02', 'practice', 92, 1, 'Create a plan-first Codex task loop.', 'Codex Agentic Loop: ask Codex to plan first.', 'approved'),
  ('coverage_context_claude', 'skill_context_engineering', 'claude-code-guide', '4', '04-01', 'practice', 92, 1, 'Extract durable project context into AI-readable rules.', 'CLAUDE.md course chapter.', 'approved'),
  ('coverage_context_hermes', 'skill_context_engineering', 'hermes-agent-guide', '5', '05-03', 'practice', 86, 0, 'Write project context that an agent can use consistently.', 'Hermes project context lesson.', 'approved'),
  ('coverage_safety_claude', 'skill_ai_safety', 'claude-code-guide', '5', '05-02', 'practice', 95, 1, 'Define an explicit AI permission policy.', 'Permissions and safety chapter.', 'approved'),
  ('coverage_safety_codex', 'skill_ai_safety', 'codex-tutorial', '6', '06-02', 'practice', 93, 1, 'Design sandbox and approval policies.', 'Codex sandbox and approval strategy lesson.', 'approved'),
  ('coverage_evaluation_claude', 'skill_evaluation', 'claude-code-guide', '9', '09-02', 'practice', 91, 1, 'Build tests before changing AI-assisted code.', 'Testing and refactoring guardrails lesson.', 'approved'),
  ('coverage_evaluation_codex', 'skill_evaluation', 'codex-tutorial', '11', '11-04', 'advanced', 88, 0, 'Use a repair loop to verify an AI-assisted fix.', 'Codex repair loop lesson.', 'approved'),
  ('coverage_mcp_claude', 'skill_mcp_tools', 'claude-code-guide', '11', '11-02', 'practice', 94, 1, 'Review MCP permissions before enabling tools.', 'MCP permission check lesson.', 'approved'),
  ('coverage_mcp_hermes', 'skill_mcp_tools', 'hermes-agent-guide', '10', '10-02', 'practice', 89, 0, 'Connect read-only tools before write access.', 'Hermes MCP permissions lesson.', 'approved'),
  ('coverage_skills_claude', 'skill_agent_skills', 'claude-code-guide', '13', '13-02', 'advanced', 92, 1, 'Design a focused testing subagent with bounded responsibilities.', 'Skills, Subagents and Plugins chapter.', 'approved'),
  ('coverage_skills_hermes', 'skill_agent_skills', 'hermes-agent-guide', '9', '09-01', 'practice', 88, 0, 'Use a Skill as maintainable procedural memory.', 'Hermes Skills lesson.', 'approved'),
  ('coverage_rag_hermes', 'skill_rag', 'hermes-agent-guide', '14', '14-03', 'advanced', 86, 1, 'Assess a long-lived retrieval knowledge base.', 'LightRAG and second brain lesson.', 'approved');
