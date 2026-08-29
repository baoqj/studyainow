-- Reconcile source-display policy after production was found to have applied
-- earlier variants of 0036/0037 under the same migration names. Migrations are
-- immutable once D1 records them, so this compensating migration is the only
-- safe way to make the current reviewed policy explicit and repeatable.

UPDATE job_sources
SET display_policy = CASE
      WHEN id IN ('source_databricks_greenhouse', 'source_equifax_workday') THEN 'excerpt'
      ELSE 'metadata_only'
    END,
    policy_reviewed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  'source_scale_ai_greenhouse', 'source_databricks_greenhouse',
  'source_xai_greenhouse', 'source_perplexity_ashby',
  'source_anyscale_ashby', 'source_cursor_ashby',
  'source_elevenlabs_ashby', 'source_modal_ashby',
  'source_langchain_ashby', 'source_pinecone_ashby',
  'source_coreweave_greenhouse', 'source_stability_ai_greenhouse',
  'source_inflection_ai_greenhouse', 'source_google_deepmind_greenhouse',
  'source_cerebras_ashby', 'source_replit_ashby',
  'source_baseten_ashby', 'source_equifax_workday'
);

-- Never continue to expose a previously stored full JD while an excerpt or
-- metadata-only policy is being rebuilt. The original source text remains
-- private analysis input; the presentation worker will republish only the
-- permitted output in bounded batches.
UPDATE job_sections
SET visibility = 'analysis_only'
WHERE visibility = 'public'
  AND job_id IN (
    SELECT id FROM job_postings
    WHERE source_id IN (
      'source_scale_ai_greenhouse', 'source_databricks_greenhouse',
      'source_xai_greenhouse', 'source_perplexity_ashby',
      'source_anyscale_ashby', 'source_cursor_ashby',
      'source_elevenlabs_ashby', 'source_modal_ashby',
      'source_langchain_ashby', 'source_pinecone_ashby',
      'source_coreweave_greenhouse', 'source_stability_ai_greenhouse',
      'source_inflection_ai_greenhouse', 'source_google_deepmind_greenhouse',
      'source_cerebras_ashby', 'source_replit_ashby',
      'source_baseten_ashby', 'source_equifax_workday'
    )
  );

UPDATE job_postings
SET presentation_version = 0,
    presentation_lock_until = NULL,
    presentation_error = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE source_id IN (
  'source_scale_ai_greenhouse', 'source_databricks_greenhouse',
  'source_xai_greenhouse', 'source_perplexity_ashby',
  'source_anyscale_ashby', 'source_cursor_ashby',
  'source_elevenlabs_ashby', 'source_modal_ashby',
  'source_langchain_ashby', 'source_pinecone_ashby',
  'source_coreweave_greenhouse', 'source_stability_ai_greenhouse',
  'source_inflection_ai_greenhouse', 'source_google_deepmind_greenhouse',
  'source_cerebras_ashby', 'source_replit_ashby',
  'source_baseten_ashby', 'source_equifax_workday'
);
