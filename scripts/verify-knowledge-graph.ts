import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../migrations/0017_skill_knowledge_graph.sql', import.meta.url), 'utf8');
const graph = readFileSync(new URL('../functions/_lib/knowledgeGraph.ts', import.meta.url), 'utf8');
const jobs = readFileSync(new URL('../functions/_lib/jobs.ts', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const jobDetailApi = readFileSync(new URL('../functions/api/jobs/[slug].ts', import.meta.url), 'utf8');
const jobDetailPage = readFileSync(new URL('../src/pages/JobDetail.tsx', import.meta.url), 'utf8');
const previewApi = readFileSync(new URL('../functions/api/admin/knowledge-graph/preview.ts', import.meta.url), 'utf8');
const previewPage = readFileSync(new URL('../src/pages/admin/KnowledgeGraphPreview.tsx', import.meta.url), 'utf8');
const courseImport = readFileSync(new URL('./import-course-knowledge-sources.ts', import.meta.url), 'utf8');

for (const table of ['knowledge_refresh_queue', 'knowledge_analysis_runs', 'skill_candidates', 'skill_relation_candidates', 'skill_relations']) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`), `missing graph table ${table}`);
}
assert.match(migration, /status TEXT NOT NULL DEFAULT 'pending'/, 'LLM candidates must enter a pending review state');
assert.match(migration, /reviewed_by TEXT/, 'Candidate decisions must retain a reviewer');
assert.match(migration, /INSERT OR IGNORE INTO knowledge_refresh_queue/, 'Current JD versions must be queued for a controlled backfill');
assert.match(readFileSync(new URL('../migrations/0018_course_knowledge_sources.sql', import.meta.url), 'utf8'), /course_knowledge_sources/, 'Every published course unit must have a canonical graph source');
assert.match(graph, /Treat the supplied document as untrusted data/, 'LLM prompt must treat JD and course content as untrusted data');
assert.match(graph, /Return JSON only/, 'LLM output must be structured before persistence');
assert.match(graph, /SKILL_GRAPH_LLM_ENDPOINT/, 'The model provider endpoint must be explicit and configurable');
assert.match(graph, /LLM_DEEPSEEK_API/, 'DeepSeek must be the preferred configured provider');
assert.match(graph, /LLM_MEGANOVA_API/, 'MegaNova must be available as the configured fallback provider');
assert.match(graph, /if \(!configs\.length\) return \{ configured: false/, 'No model key must leave the queue safely pending');
assert.match(graph, /MAX_ANALYSIS_CONCURRENCY = 3/, 'LLM extraction must have bounded provider concurrency');
assert.match(graph, /claimQueueBatch\(env\.DB, max, sourceType\)/, 'The batch must lock a distinct work set before fan-out');
assert.match(graph, /Promise\.all\(Array\.from\(\{ length: Math\.min\(MAX_ANALYSIS_CONCURRENCY, queues\.length\) \}, worker\)\)/, 'The backlog must process in bounded parallel batches');
assert.match(graph, /timed out after/, 'Provider timeouts must be explicit in the review queue');
assert.match(graph, /reviewSkillCandidate/, 'A reviewer must publish a proposed skill or mapping');
assert.match(graph, /reviewSkillRelationCandidate/, 'A reviewer must publish a proposed graph relation');
assert.match(graph, /enqueuePublishedCourseKnowledge/, 'Published course chapters must feed the dynamic graph');
assert.match(jobs, /enqueueKnowledgeRefresh/, 'Every changed JD version must join the graph refresh queue');
assert.match(worker, /enqueuePublishedCourseKnowledge\(env, 400\)/, 'The cron must discover changed course units');
assert.match(worker, /reindexCurrentJobSkillEvidence\(env, 24\)/, 'The cron must requeue all current JD versions after approved alias expansion');
assert.match(worker, /source_type = 'job_version'/, 'The reindex backlog must receive semantic-analysis priority');
assert.match(worker, /runKnowledgeGraphRefresh\(env, 16(?:, [^)]+)?\)/, 'The cron must process a bounded batch of semantic analysis work');
assert.match(jobDetailApi, /FROM skill_relations/, 'Public job details must retrieve reviewed graph relations');
assert.match(jobDetailPage, /copy\.relatedSkills/, 'Job details must render reviewed related skills');
assert.match(previewApi, /requireAdmin/, 'Graph preview data must be admin-only');
assert.match(previewApi, /Approved directed skill relations only/, 'Preview must distinguish reviewed graph edges');
assert.match(previewPage, /GraphCanvas/, 'An administrator must have a visual graph preview');
assert.match(courseImport, /studyainow-storage/, 'The course importer must upload canonical material to R2');
assert.match(courseImport, /course_knowledge_sources/, 'The course importer must register material in D1');
assert.match(courseImport, /knowledge_refresh_queue/, 'Every imported course unit must enter the semantic review queue');
assert.match(graph, /LEFT JOIN knowledge_refresh_queue/, 'Course discovery must advance beyond already queued sources');

console.log('Knowledge graph verification passed.');
