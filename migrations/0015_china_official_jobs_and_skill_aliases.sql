-- First mainland-China source: the official Baidu public careers board. The
-- Worker reads only the server-rendered structured public listing; it does not
-- use Baidu's authenticated application APIs.
INSERT OR IGNORE INTO companies (id, slug, name, official_website, career_url, status)
VALUES (
  'company_baidu',
  'baidu',
  'Baidu',
  'https://www.baidu.com/',
  'https://talent.baidu.com/jobs/social',
  'active'
);

INSERT OR IGNORE INTO job_sources
  (id, company_id, source_type, board_token, official_career_url, endpoint_url, acquisition_policy,
   display_policy, terms_url, policy_reviewed_at, polling_minutes, next_fetch_at, enabled)
VALUES (
  'source_baidu_social_structured',
  'company_baidu',
  'json_ld',
  'baidu-social',
  'https://talent.baidu.com/jobs/social',
  'https://talent.baidu.com/jobs/social-list',
  'structured_data',
  'full_text_authorized',
  'https://talent.baidu.com/jobs/social',
  CURRENT_TIMESTAMP,
  720,
  CURRENT_TIMESTAMP,
  1
);

-- Chinese source-language aliases keep the existing reviewed skills and course
-- mappings usable for mainland Chinese JDs. These are phrase matches because
-- Unicode word-boundary matching is not dependable for Chinese text.
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_agent_skills_zh', id, '智能体技能', 'phrase' FROM skills WHERE slug = 'agent-skills-and-subagents';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_subagent_zh', id, '子智能体', 'phrase' FROM skills WHERE slug = 'agent-skills-and-subagents';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_agentic_workflow_zh', id, '智能体工作流', 'phrase' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_multi_agent_zh', id, '多智能体', 'phrase' FROM skills WHERE slug = 'agentic-workflows';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_guardrails_zh', id, '安全护栏', 'phrase' FROM skills WHERE slug = 'ai-safety-guardrails';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_sandbox_zh', id, '沙盒', 'phrase' FROM skills WHERE slug = 'ai-safety-guardrails';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_context_engineering_zh', id, '上下文工程', 'phrase' FROM skills WHERE slug = 'context-engineering';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_context_window_zh', id, '上下文窗口', 'phrase' FROM skills WHERE slug = 'context-engineering';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_mcp_zh', id, '模型上下文协议', 'phrase' FROM skills WHERE slug = 'mcp-tool-integration';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_tool_calling_zh', id, '工具调用', 'phrase' FROM skills WHERE slug = 'mcp-tool-integration';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_model_evaluation_zh', id, '模型评测', 'phrase' FROM skills WHERE slug = 'model-evaluation';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_model_regression_zh', id, '回归测试', 'phrase' FROM skills WHERE slug = 'model-evaluation';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_rag_zh', id, '检索增强生成', 'phrase' FROM skills WHERE slug = 'rag-knowledge-retrieval';
INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, match_type)
SELECT 'alias_vector_database_zh', id, '向量数据库', 'phrase' FROM skills WHERE slug = 'rag-knowledge-retrieval';
