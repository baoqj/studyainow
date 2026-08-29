-- Phase-one source expansion. Every feed is the employer's own public
-- Greenhouse or Ashby board and was live-checked on 2026-08-27. Full source
-- text remains private analysis input; only normalized metadata is public by
-- default until a separate display-rights review authorizes an excerpt/full JD.

INSERT OR IGNORE INTO companies (id, slug, name, official_website, career_url, status) VALUES
  ('company_scale_ai', 'scale-ai', 'Scale AI', 'https://scale.com/', 'https://scale.com/careers', 'active'),
  ('company_databricks', 'databricks', 'Databricks', 'https://www.databricks.com/', 'https://www.databricks.com/company/careers/open-positions', 'active'),
  ('company_xai', 'xai', 'xAI', 'https://x.ai/', 'https://x.ai/careers/open-roles', 'active'),
  ('company_perplexity', 'perplexity', 'Perplexity', 'https://www.perplexity.ai/', 'https://www.perplexity.ai/careers', 'active'),
  ('company_anyscale', 'anyscale', 'Anyscale', 'https://www.anyscale.com/', 'https://www.anyscale.com/careers', 'active'),
  ('company_cursor', 'cursor', 'Cursor', 'https://cursor.com/', 'https://cursor.com/careers', 'active'),
  ('company_elevenlabs', 'elevenlabs', 'ElevenLabs', 'https://elevenlabs.io/', 'https://elevenlabs.io/careers', 'active'),
  ('company_modal', 'modal', 'Modal', 'https://modal.com/', 'https://modal.com/careers', 'active'),
  ('company_langchain', 'langchain', 'LangChain', 'https://www.langchain.com/', 'https://www.langchain.com/careers', 'active'),
  ('company_pinecone', 'pinecone', 'Pinecone', 'https://www.pinecone.io/', 'https://www.pinecone.io/careers/', 'active'),
  ('company_coreweave', 'coreweave', 'CoreWeave', 'https://www.coreweave.com/', 'https://www.coreweave.com/careers', 'active'),
  ('company_stability_ai', 'stability-ai', 'Stability AI', 'https://stability.ai/', 'https://stability.ai/careers', 'active'),
  ('company_inflection_ai', 'inflection-ai', 'Inflection AI', 'https://inflection.ai/', 'https://inflection.ai/careers', 'active'),
  ('company_google_deepmind', 'google-deepmind', 'Google DeepMind', 'https://deepmind.google/', 'https://deepmind.google/about/careers/', 'active'),
  ('company_cerebras', 'cerebras', 'Cerebras', 'https://www.cerebras.ai/', 'https://www.cerebras.ai/careers', 'active'),
  ('company_replit', 'replit', 'Replit', 'https://replit.com/', 'https://replit.com/careers', 'active'),
  ('company_baseten', 'baseten', 'Baseten', 'https://www.baseten.co/', 'https://www.baseten.co/careers', 'active');

INSERT OR IGNORE INTO job_sources
  (id, company_id, source_type, board_token, official_career_url, endpoint_url, acquisition_policy,
   display_policy, terms_url, policy_reviewed_at, polling_minutes, next_fetch_at, enabled)
VALUES
  ('source_scale_ai_greenhouse', 'company_scale_ai', 'greenhouse', 'scaleai', 'https://scale.com/careers', 'https://boards-api.greenhouse.io/v1/boards/scaleai/jobs?content=true', 'api_allowed', 'metadata_only', 'https://scale.com/legal/terms', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_databricks_greenhouse', 'company_databricks', 'greenhouse', 'databricks', 'https://www.databricks.com/company/careers/open-positions', 'https://boards-api.greenhouse.io/v1/boards/databricks/jobs?content=true', 'api_allowed', 'metadata_only', 'https://www.databricks.com/legal/terms-of-use', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_xai_greenhouse', 'company_xai', 'greenhouse', 'xai', 'https://x.ai/careers/open-roles', 'https://boards-api.greenhouse.io/v1/boards/xai/jobs?content=true', 'api_allowed', 'metadata_only', 'https://x.ai/legal/terms-of-service', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_perplexity_ashby', 'company_perplexity', 'ashby', 'perplexity', 'https://www.perplexity.ai/careers', 'https://api.ashbyhq.com/posting-api/job-board/perplexity?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://www.perplexity.ai/hub/legal/terms-of-service', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_anyscale_ashby', 'company_anyscale', 'ashby', 'anyscale', 'https://www.anyscale.com/careers', 'https://api.ashbyhq.com/posting-api/job-board/anyscale?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://www.anyscale.com/terms', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_cursor_ashby', 'company_cursor', 'ashby', 'cursor', 'https://cursor.com/careers', 'https://api.ashbyhq.com/posting-api/job-board/cursor?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://cursor.com/terms-of-service', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_elevenlabs_ashby', 'company_elevenlabs', 'ashby', 'elevenlabs', 'https://elevenlabs.io/careers', 'https://api.ashbyhq.com/posting-api/job-board/elevenlabs?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://elevenlabs.io/terms-of-use', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_modal_ashby', 'company_modal', 'ashby', 'modal', 'https://modal.com/careers', 'https://api.ashbyhq.com/posting-api/job-board/modal?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://modal.com/legal/terms', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_langchain_ashby', 'company_langchain', 'ashby', 'langchain', 'https://www.langchain.com/careers', 'https://api.ashbyhq.com/posting-api/job-board/langchain?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://www.langchain.com/terms-of-service', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_pinecone_ashby', 'company_pinecone', 'ashby', 'pinecone', 'https://www.pinecone.io/careers/', 'https://api.ashbyhq.com/posting-api/job-board/pinecone?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://www.pinecone.io/terms/', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_coreweave_greenhouse', 'company_coreweave', 'greenhouse', 'coreweave', 'https://www.coreweave.com/careers', 'https://boards-api.greenhouse.io/v1/boards/coreweave/jobs?content=true', 'api_allowed', 'metadata_only', 'https://docs.coreweave.com/policies/terms-of-service/terms-of-use', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_stability_ai_greenhouse', 'company_stability_ai', 'greenhouse', 'stabilityai', 'https://stability.ai/careers', 'https://boards-api.greenhouse.io/v1/boards/stabilityai/jobs?content=true', 'api_allowed', 'metadata_only', 'https://stability.ai/terms-of-use', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_inflection_ai_greenhouse', 'company_inflection_ai', 'greenhouse', 'inflectionai', 'https://inflection.ai/careers', 'https://boards-api.greenhouse.io/v1/boards/inflectionai/jobs?content=true', 'api_allowed', 'metadata_only', 'https://inflection.ai/terms-of-service', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_google_deepmind_greenhouse', 'company_google_deepmind', 'greenhouse', 'deepmind', 'https://deepmind.google/about/careers/', 'https://boards-api.greenhouse.io/v1/boards/deepmind/jobs?content=true', 'api_allowed', 'metadata_only', 'https://policies.google.com/terms', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_cerebras_ashby', 'company_cerebras', 'ashby', 'cerebras', 'https://www.cerebras.ai/careers', 'https://api.ashbyhq.com/posting-api/job-board/cerebras?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://www.cerebras.ai/terms-of-service', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_replit_ashby', 'company_replit', 'ashby', 'replit', 'https://replit.com/careers', 'https://api.ashbyhq.com/posting-api/job-board/replit?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://replit.com/terms-of-service', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1),
  ('source_baseten_ashby', 'company_baseten', 'ashby', 'baseten', 'https://www.baseten.co/careers', 'https://api.ashbyhq.com/posting-api/job-board/baseten?includeCompensation=false', 'api_allowed', 'metadata_only', 'https://www.baseten.co/terms-and-conditions/', CURRENT_TIMESTAMP, 720, CURRENT_TIMESTAMP, 1);
