import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { normalizePayload } from '../functions/_lib/jobs';
import { JOB_EMBEDDING_DIMENSIONS, JOB_EMBEDDING_MODEL } from '../functions/_lib/jobVectors';

const semanticMigration = readFileSync(new URL('../migrations/0035_job_semantic_vectors_and_tags.sql', import.meta.url), 'utf8');
const sourcesMigration = readFileSync(new URL('../migrations/0036_official_ai_employer_sources.sql', import.meta.url), 'utf8');
const jobsLibrary = readFileSync(new URL('../functions/_lib/jobs.ts', import.meta.url), 'utf8');
const graphLibrary = readFileSync(new URL('../functions/_lib/knowledgeGraph.ts', import.meta.url), 'utf8');
const vectorLibrary = readFileSync(new URL('../functions/_lib/jobVectors.ts', import.meta.url), 'utf8');
const jobsApi = readFileSync(new URL('../functions/api/jobs/index.ts', import.meta.url), 'utf8');
const detailApi = readFileSync(new URL('../functions/api/jobs/[slug].ts', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');

for (const table of ['job_tags', 'job_vector_records']) {
  assert.match(semanticMigration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}
for (const field of ['source_updated_at', 'first_collected_at', 'last_seen_at']) {
  assert.match(semanticMigration, new RegExp(`ADD COLUMN ${field}`));
}
assert.match(semanticMigration, /analysis_only/, 'Private semantic input must be distinct from public JD sections');
assert.match(semanticMigration, /source_method TEXT NOT NULL/, 'Every normalized tag must retain provenance');
assert.match(semanticMigration, /EXISTS \([\s\S]*knowledge_refresh_queue[\s\S]*status = 'completed'/, 'Vector backfill must wait for semantic analysis');
assert.equal((sourcesMigration.match(/'metadata_only'/g) ?? []).length, 17, 'Every phase-one employer must default to metadata-only display');
assert.equal((sourcesMigration.match(/source_[a-z0-9_]+', 'company_/g) ?? []).length, 17, 'Phase one must register seventeen direct employers');
assert.match(sourcesMigration, /source_google_deepmind_greenhouse/);
assert.match(sourcesMigration, /source_perplexity_ashby/);
assert.match(jobsLibrary, /runDueSourceSync\(env: Env, limit = 50\)/, 'The same two daily runs must cover the expanded source set');
assert.match(jobsLibrary, /runConcurrent\(sources\.results, 1/, 'Source expansion must stay below the Worker memory ceiling');
assert.match(jobsLibrary, /offset \+= 20/, 'Large ATS payloads must be normalized in bounded chunks');
assert.match(jobsLibrary, /visibility\)\s*VALUES[\s\S]*'analysis_only'/, 'Metadata-only descriptions must enter a private analysis section');
assert.match(graphLibrary, /"keywords"/, 'Semantic analysis must request normalized knowledge keywords');
assert.match(graphLibrary, /INSERT INTO job_tags/, 'Semantic output must persist versioned tags');
assert.match(graphLibrary, /@cf\/qwen\/qwen3-30b-a3b-fp8/, 'Workers AI must keep semantic analysis available when external providers fail');
assert.match(graphLibrary, /if \(env\.AI\)/, 'Workers AI must be a real runtime fallback, not only a configured binding');
assert.match(graphLibrary, /Return at most \$\{MAX_CANDIDATES\} skills/, 'Structured extraction must stay below the model completion window');
assert.match(vectorLibrary, /knowledge_refresh_queue[\s\S]*status = 'completed'/, 'Embeddings must be gated on completed semantic analysis');
assert.match(vectorLibrary, /MAX_EMBEDDING_REQUEST_ITEMS = 8/, 'Embedding requests must remain below the Workers AI context window');
assert.match(vectorLibrary, /MAX_EMBEDDING_REQUEST_CHARACTERS = 40_000/, 'Embedding requests must use a bounded total character budget');
assert.match(worker, /runPendingJobVectorIndex\(env, 24\)/, 'The existing graph schedule must advance vector indexing');
assert.match(wrangler, /crons = \["0 0,12 \* \* \*"/, 'Job crawling must remain twice daily');
assert.match(wrangler, /cpu_ms = 300_000/, 'A complete large-board pass must not inherit the 30-second CPU default');
assert.match(wrangler, /binding = "JOB_VECTORS"/);
assert.match(wrangler, /binding = "AI"/);
assert.match(jobsApi, /query_tag\.label LIKE/, 'Normalized tags must participate in catalogue search');
assert.match(detailApi, /visibility = 'public'/, 'Private analysis sections must never be returned by the public detail API');
assert.equal(JOB_EMBEDDING_MODEL, '@cf/baai/bge-m3');
assert.equal(JOB_EMBEDDING_DIMENSIONS, 1024);

const greenhouse = normalizePayload('greenhouse', {
  jobs: [{
    id: 101,
    title: 'Machine Learning Engineer',
    absolute_url: 'https://boards.greenhouse.io/example/jobs/101',
    content: '<p>Build multilingual retrieval systems with Python and vector databases.</p>',
    first_published: '2026-08-01T12:30:00-04:00',
    updated_at: '2026-08-03T08:15:00-04:00',
    departments: [{ name: 'AI Platform' }],
    metadata: [{ name: 'Domain', value: ['Retrieval', 'Agents'] }],
    location: { name: 'Toronto, Ontario, Canada' },
    language: 'en',
  }],
}, null)[0];
assert.equal(greenhouse.sourcePublishedAt, '2026-08-01T16:30:00.000Z');
assert.equal(greenhouse.sourceUpdatedAt, '2026-08-03T12:15:00.000Z');
assert.deepEqual(greenhouse.tags.map((tag) => [tag.type, tag.key]), [
  ['department', 'ai-platform'],
  ['source', 'retrieval'],
  ['source', 'agents'],
]);

const ashby = normalizePayload('ashby', {
  jobs: [{
    id: 'job-202',
    title: 'LLM Infrastructure Engineer',
    jobUrl: 'https://jobs.ashbyhq.com/example/job-202',
    applyUrl: 'https://jobs.ashbyhq.com/example/job-202/application',
    descriptionPlain: 'Operate distributed model inference and evaluation systems.',
    publishedAt: '2026-08-02T09:00:00Z',
    department: 'Engineering',
    team: 'Inference',
    employmentType: 'FullTime',
    workplaceType: 'Hybrid',
    location: 'New York, NY',
  }],
}, null)[0];
assert.equal(ashby.sourcePublishedAt, '2026-08-02T09:00:00.000Z');
assert.deepEqual(ashby.tags.map((tag) => tag.type), ['department', 'team', 'employment', 'workplace']);

console.log('Job semantic index verification passed.');
