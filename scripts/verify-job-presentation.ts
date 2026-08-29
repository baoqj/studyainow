import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { JOB_PRESENTATION_VERSION, normalizePayload, publicTextFor } from '../functions/_lib/jobs';
import { visibleJobSignals, type JobTag } from '../src/lib/jobs';

const migration = readFileSync(new URL('../migrations/0037_job_presentation_refresh.sql', import.meta.url), 'utf8');
const jobsLibrary = readFileSync(new URL('../functions/_lib/jobs.ts', import.meta.url), 'utf8');
const detailApi = readFileSync(new URL('../functions/api/jobs/[slug].ts', import.meta.url), 'utf8');
const detailPage = readFileSync(new URL('../src/pages/JobDetail.tsx', import.meta.url), 'utf8');

const sourceDescription = [
  'Mission',
  'As an AI Engineer you will build production-quality Generative AI applications with customers.',
  'The impact you will have',
  '• Ship retrieval augmented generation systems using Python and vector databases.',
  '• Evaluate LLM quality, safety, latency, and cost.',
  'What we look for',
  '• Experience building machine learning or LLM applications in production.',
  '• Strong Python, SQL, distributed systems, and stakeholder communication skills.',
  '• Knowledge of MLOps and model evaluation practices.',
  'About the company',
  'This footer should not displace job-specific requirements from the excerpt.',
].join('\n\n');

assert.equal(JOB_PRESENTATION_VERSION, 1);
assert.equal(publicTextFor(sourceDescription, 'metadata_only'), '');
assert.equal(publicTextFor(sourceDescription, 'full_text_authorized'), sourceDescription);
const excerpt = publicTextFor(sourceDescription, 'excerpt');
assert.match(excerpt, /^Mission/);
assert.match(excerpt, /What we look for/);
assert.match(excerpt, /retrieval augmented generation/);
assert.ok(excerpt.length <= 1_800, 'Public excerpts must stay within the policy limit');

const normalized = normalizePayload('greenhouse', {
  jobs: [{
    id: 8747605002,
    title: 'AI Engineer - FDE (Forward Deployed Engineer)',
    absolute_url: 'https://boards.greenhouse.io/databricks/jobs/8747605002',
    content: '&lt;h2&gt;Mission&lt;/h2&gt;&lt;p&gt;Build Generative AI applications with customers.&lt;/p&gt;',
    first_published: '2026-08-21T09:30:00-04:00',
    updated_at: '2026-08-26T10:00:00-04:00',
    location: { name: 'San Francisco, California' },
  }],
}, null)[0];
assert.match(normalized.description, /Mission/);
assert.match(normalized.description, /Generative AI applications/);
assert.equal(normalized.sourcePublishedAt, '2026-08-21T13:30:00.000Z');

const tags: JobTag[] = [
  { key: 'llm', label: 'LLM', type: 'technology', language: 'en', source: 'llm_analysis', confidence: 0.96 },
  { key: 'llm-duplicate', label: 'llm', type: 'skill', language: 'en', source: 'llm_analysis', confidence: 0.82 },
  { key: 'professional-services', label: 'Professional Services', type: 'department', language: 'en', source: 'source_metadata', confidence: 1 },
  { key: 'weak', label: 'Weak signal', type: 'knowledge', language: 'en', source: 'llm_analysis', confidence: 0.3 },
  { key: 'rag', label: 'RAG', type: 'method', language: 'en', source: 'llm_analysis', confidence: 0.9 },
];
assert.deepEqual(visibleJobSignals(tags).map((tag) => tag.label), ['LLM', 'RAG']);

for (const column of ['presentation_version', 'presentation_hash', 'presentation_lock_until', 'presentation_error']) {
  assert.match(migration, new RegExp(`ADD COLUMN ${column}`));
}
assert.match(migration, /source_databricks_greenhouse[\s\S]*display_policy = 'excerpt'|display_policy = 'excerpt'[\s\S]*source_databricks_greenhouse/);
assert.match(jobsLibrary, /runPendingJobPresentationRefresh/);
assert.match(jobsLibrary, /visibility = 'public'/, 'Presentation refresh must replace public sections only');
assert.match(detailApi, /job_sections\.visibility = 'public'|visibility = 'public'/, 'Private source analysis must remain excluded from the public API');
assert.match(detailPage, /semanticSignalsNotice/);
assert.match(detailPage, /sourceExcerptText/);

console.log('Job presentation unit verification passed.');
