-- Precise English phrase aliases for the Agent engineering taxonomy. These
-- map source-language JD evidence to skills that already have approved course
-- coverage; no new concept is exposed without the graph review workflow.
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agentic_ai_agent', id, 'AI agent', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agentic_ai_agents', id, 'AI agents', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agentic_autonomous_ai_agent', id, 'autonomous AI agent', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agentic_autonomous_ai_agents', id, 'autonomous AI agents', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agentic_infrastructure', id, 'agentic AI infrastructure', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agentic_system', id, 'agentic system', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agentic_systems', id, 'agentic systems', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agent_systems', id, 'agent systems', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agent_workflow', id, 'agent workflow', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agent_workflows', id, 'agent workflows', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agent_development_framework', id, 'agent development framework', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_agent_development_frameworks', id, 'agent development frameworks', 'en', 'phrase', '[]' FROM skills WHERE slug = 'agentic-workflows';

INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_multi_agent_workflow', id, 'multi-agent workflow', 'en', 'phrase', '[]' FROM skills WHERE slug = 'multi-agent-design';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_multi_agent_workflows', id, 'multi-agent workflows', 'en', 'phrase', '[]' FROM skills WHERE slug = 'multi-agent-design';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_multi_agent_system', id, 'multi-agent system', 'en', 'phrase', '[]' FROM skills WHERE slug = 'multi-agent-design';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_multi_agent_systems', id, 'multi-agent systems', 'en', 'phrase', '[]' FROM skills WHERE slug = 'multi-agent-design';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_multi_agent_orchestration', id, 'multi-agent orchestration', 'en', 'phrase', '[]' FROM skills WHERE slug = 'multi-agent-design';

INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_model_routing_llm_provider_framework', id, 'LLM provider framework', 'en', 'phrase', '[]' FROM skills WHERE slug = 'model-routing';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json)
SELECT 'alias_model_routing_llm_provider_frameworks', id, 'LLM provider frameworks', 'en', 'phrase', '[]' FROM skills WHERE slug = 'model-routing';

-- The Worker rebuilds the reproducible dictionary layer in bounded batches,
-- requeues each current JD for DeepSeek semantic analysis, and never deletes
-- human-reviewed or exact-source LLM evidence.
CREATE TABLE IF NOT EXISTS job_skill_evidence_reindex_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cursor_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed')),
  locked_until TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO job_skill_evidence_reindex_state (id, status)
VALUES (1, 'pending');
