import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { estimateTokenCount, recordLlmUsage, usageFromOpenAiPayload } from '../functions/_lib/llmUsage';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const migration = read('../migrations/0042_llm_token_usage.sql');
const helper = read('../functions/_lib/llmUsage.ts');
const adminHelper = read('../functions/_lib/llmUsageAdmin.ts');
const resume = read('../functions/_lib/resume.ts');
const resumeParse = read('../functions/api/resumes/[resumeId]/parse.ts');
const resumeGenerate = read('../functions/api/resumes/[resumeId].ts');
const knowledgeGraph = read('../functions/_lib/knowledgeGraph.ts');
const curriculum = read('../functions/_lib/curriculumLocalization.ts');
const vectors = read('../functions/_lib/jobVectors.ts');
const worker = read('../src/worker.ts');
const app = read('../src/App.tsx');
const sidebar = read('../src/components/admin/AdminSidebar.tsx');
const topbar = read('../src/components/admin/AdminTopbar.tsx');
const page = read('../src/pages/admin/AdminTokenUsage.tsx');

assert.match(migration, /CREATE TABLE IF NOT EXISTS llm_usage_events/, 'LLM usage migration must create the event table');
for (const column of ['user_id', 'feature', 'operation', 'provider', 'model', 'item_type', 'item_id', 'item_label', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'estimated', 'request_count', 'status', 'metadata_json', 'created_at']) {
  assert.match(migration, new RegExp(`\\b${column}\\b`), `missing usage column ${column}`);
}
for (const index of ['idx_llm_usage_created_at', 'idx_llm_usage_user_created', 'idx_llm_usage_feature_created', 'idx_llm_usage_provider_model_created']) {
  assert.match(migration, new RegExp(index), `missing index ${index}`);
}
assert.doesNotMatch(migration, /\bBEGIN\b|\bCOMMIT\b/, 'Wrangler owns migration transaction boundaries');

assert.match(helper, /usageFromOpenAiPayload/, 'helper must parse provider usage payloads');
assert.match(helper, /estimateTokenCount/, 'helper must estimate usage when providers omit billing tokens');
assert.match(helper, /console\.warn\('LLM usage logging failed'/, 'usage logging must not fail the business workflow');
assert.match(adminHelper, /usageSeries/, 'admin helper must expose day week month series');
assert.match(adminHelper, /usageByFeature/, 'admin helper must expose feature breakdowns');

for (const feature of ['resume_extract', 'resume_generate', 'knowledge_graph', 'curriculum_localization', 'job_embedding']) {
  assert.ok(migration.includes(feature) || helper.includes(feature) || resume.includes(feature) || knowledgeGraph.includes(feature) || curriculum.includes(feature) || vectors.includes(feature), `missing feature ${feature}`);
}

assert.match(resume, /recordOpenAiUsage/, 'resume LLM wrapper must record token usage');
assert.match(resumeParse, /feature: 'resume_extract'/, 'resume uploads must record extraction usage');
assert.match(resumeGenerate, /feature: 'resume_generate'/, 'resume generation must record generation usage');
assert.match(knowledgeGraph, /feature: 'knowledge_graph'/, 'knowledge graph refresh must record usage');
assert.match(curriculum, /feature: 'curriculum_localization'/, 'curriculum localization must record usage');
assert.match(vectors, /feature: 'job_embedding'/, 'job embeddings must record Workers AI usage');
assert.match(vectors, /operation: 'embedding'/, 'job embeddings must be distinguishable from chat completions');

assert.match(worker, /getAdminTokenUsage/, 'Worker must import admin token usage overview');
assert.match(worker, /getAdminUserTokenUsage/, 'Worker must import admin token usage detail');
assert.match(worker, /'\/api\/admin\/token-usage'/, 'Worker must route the token usage overview API');
assert.match(worker, /adminTokenUsageUserMatch/, 'Worker must route per-user token usage API');
assert.match(app, /AdminTokenUsage/, 'App must lazy-load the admin token usage page');
assert.match(app, /path="token-usage"/, 'App must expose /admin/token-usage');
assert.match(app, /path="token-usage\/users\/:userId"/, 'App must expose per-user token usage details');
assert.match(sidebar, /流量使用/, 'Admin sidebar must expose token usage');
assert.match(topbar, /流量使用/, 'Admin topbar must title token usage routes');
assert.match(page, /BarChart/, 'Admin token page must visualize usage');
assert.match(page, /用户流量排行/, 'Admin token page must list per-user usage');
assert.match(page, /最近调用事件/, 'Admin token page must show per-user events');

assert.deepEqual(usageFromOpenAiPayload({ usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } }), {
  promptTokens: 10,
  completionTokens: 4,
  totalTokens: 14,
});
assert.deepEqual(usageFromOpenAiPayload({ usage: { input_tokens: 7, output_tokens: 3 } }), {
  promptTokens: 7,
  completionTokens: 3,
  totalTokens: 10,
});
assert.ok(estimateTokenCount('AI agents and multi-agent workflows') > 3, 'English token estimate should be non-zero');
assert.ok(estimateTokenCount('人工智慧與軟體工程') >= 8, 'CJK token estimate should not be undercounted aggressively');

const calls: unknown[][] = [];
const fakeDb = {
  prepare() {
    return {
      bind(...values: unknown[]) {
        calls.push(values);
        return { run: async () => ({ success: true }) };
      },
    };
  },
} as unknown as D1Database;

await recordLlmUsage(fakeDb, {
  userId: 'user_1',
  feature: 'resume_generate',
  itemType: 'resume_version',
  itemId: 'resume_version_1',
  itemLabel: 'AI Engineer',
  metadata: { resumeId: 'resume_1' },
}, {
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  promptTokens: 100,
  completionTokens: 40,
  estimated: false,
  inputCharacters: 600,
  outputCharacters: 200,
  durationMs: 1234,
});
assert.equal(calls.length, 1, 'recordLlmUsage should insert one row');
assert.equal(calls[0][2], 'resume_generate', 'inserted row must retain feature');
assert.equal(calls[0][10], 100, 'inserted row must retain prompt token count');
assert.equal(calls[0][12], 140, 'total tokens must default to prompt plus completion');

console.log('LLM token usage verification passed.');
