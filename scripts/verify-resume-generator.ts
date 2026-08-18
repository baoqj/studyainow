import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { careerFactCount, extractCareerFactsFromUpload, extractFileText, extractPdfText, fallbackGeneratedDocument, generateResumeWithDeepSeek, normaliseCareerProfile } from '../functions/_lib/resume';
import { jobResponsibilitySnippets } from '../functions/_lib/bookmarkedResumeJobs';

const migration = readFileSync(new URL('../migrations/0020_resume_generator.sql', import.meta.url), 'utf8');
const multiResumeMigration = readFileSync(new URL('../migrations/0029_multi_resume_documents.sql', import.meta.url), 'utf8');
const sourceRetentionMigration = readFileSync(new URL('../migrations/0030_resume_source_r2_retention.sql', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../src/pages/user/ResumeStudio.tsx', import.meta.url), 'utf8');
const list = readFileSync(new URL('../src/pages/user/ResumeList.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../functions/api/resumes/index.ts', import.meta.url), 'utf8');
const detailApi = readFileSync(new URL('../functions/api/resumes/[resumeId].ts', import.meta.url), 'utf8');
const parseApi = readFileSync(new URL('../functions/api/resumes/[resumeId]/parse.ts', import.meta.url), 'utf8');
const sourceApi = readFileSync(new URL('../functions/api/resumes/[resumeId]/sources/[sourceId].ts', import.meta.url), 'utf8');
const reparseSourceApi = readFileSync(new URL('../functions/api/resumes/[resumeId]/sources/[sourceId]/reparse.ts', import.meta.url), 'utf8');
const bookmarkedJobsApi = readFileSync(new URL('../functions/api/resumes/[resumeId]/bookmarked-jobs.ts', import.meta.url), 'utf8');
const bookmarkedJobs = readFileSync(new URL('../functions/_lib/bookmarkedResumeJobs.ts', import.meta.url), 'utf8');
const extraction = readFileSync(new URL('../functions/_lib/resume.ts', import.meta.url), 'utf8');
const memberLayout = readFileSync(new URL('../src/components/user/UserLayout.tsx', import.meta.url), 'utf8');

for (const table of ['resume_templates', 'resume_source_documents', 'resume_exports']) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`), `missing ${table}`);
  assert.match(migration, /user_id TEXT NOT NULL/, `${table} must be user-scoped`);
}
assert.match(multiResumeMigration, /CREATE TABLE IF NOT EXISTS resume_documents/, 'missing multi-resume table');
assert.match(multiResumeMigration, /resume_id TEXT/, 'sources and versions must link to a resume document');
assert.match(sourceRetentionMigration, /r2_key TEXT/, 'resume source storage must track its private R2 key');
for (const route of ["'/api/resumes/export'", 'resumeParseMatch', 'resumeGenerateMatch', 'resumeSourceReparseMatch', 'resumeSourceMatch', 'resumeMatch']) assert.ok(worker.includes(route), `missing ${route}`);
assert.match(api, /requireUser\(env\.DB, request\)/, 'resume API must require authentication');
assert.match(detailApi, /generateResumeWithDeepSeek/, 'resume detail API must use the DeepSeek generator');
assert.match(detailApi, /listBookmarkedResumeJobs/, 'resume generation must resolve the current user\'s saved jobs server-side');
assert.match(detailApi, /jobSlugs\(body\.jobSlugs\)/, 'resume generation must require selected saved job slugs');
assert.match(detailApi, /Unsupported resume output language/, 'resume output locale must be validated server-side');
assert.match(studio, /persistCurrentProfile/, 'resume generation must persist the current profile before generating');
assert.match(extraction, /tailoredDescription/, 'the LLM must return tailored experience and project descriptions');
assert.match(extraction, /never copy a job requirement as if the candidate performed it/i, 'job requirements must not become invented candidate claims');
assert.match(bookmarkedJobsApi, /requireUser\(env\.DB, request\)/, 'saved job references must require authentication');
assert.match(bookmarkedJobsApi, /resume_documents WHERE id = \? AND user_id = \?/, 'saved job references must be scoped to the selected resume owner');
assert.match(bookmarkedJobs, /user_job_bookmarks/, 'resume job references must originate from bookmarks');
assert.match(bookmarkedJobs, /Full JD text stays server-side/, 'the client must receive only concise job references');
assert.match(detailApi, /resume_documents WHERE id = \? AND user_id = \?/, 'resume detail API must be user-scoped');
assert.match(parseApi, /resume_documents WHERE id = \? AND user_id = \?/, 'resume uploads must be scoped to the selected resume');
assert.match(parseApi, /COURSE_STORAGE\.put/, 'new resume uploads must be retained privately in R2');
assert.match(sourceApi, /COURSE_STORAGE\.delete/, 'source deletion must remove the original R2 object');
assert.match(sourceApi, /DELETE FROM resume_source_documents/, 'source deletion must remove the D1 record');
assert.match(reparseSourceApi, /COURSE_STORAGE\.get/, 'source re-extraction must use the owner\'s retained R2 object');
assert.match(parseApi, /extractCareerFactsFromUpload/, 'resume uploads must keep PDF text extraction separate from AI analysis');
assert.match(reparseSourceApi, /extractCareerFactsFromUpload/, 'source re-extraction must use the current model fallback chain');
assert.match(reparseSourceApi, /UPDATE resume_source_documents/, 'source re-extraction must replace stale extraction data');
assert.match(extraction, /no_readable_text/, 'empty PDFs must be reported as unavailable rather than parsed');
assert.match(studio, /\.docx,\.pdf,\.txt,\.jpg,\.jpeg,\.png,\.md/, 'upload formats must be exposed in the UI');
assert.match(studio, /\/parse/, 'uploads must target the selected resume');
assert.match(studio, /exportDocx/, 'DOCX export must be available');
assert.match(studio, /exportPdf/, 'PDF export must be available');
assert.match(studio, /exportMarkdown/, 'Markdown export must be available');
assert.match(studio, /normaliseProfilePayload/, 'resume data from the API must be normalised before rendering');
assert.match(studio, /\/reparse/, 'low-fact source files must expose a re-extraction action');
assert.match(studio, /\/bookmarked-jobs/, 'resume editor must load saved jobs for generation');
assert.match(studio, /type="checkbox"/, 'saved jobs must be selectable by checkbox');
assert.match(studio, /ChevronDown/, 'saved jobs must support expanding responsibility and skill references');
assert.match(studio, /outputLocale/, 'resume editor must send the selected output language');
assert.match(studio, /jobSelectorCopy/, 'saved job and output language controls must have five-language UI copy');
assert.match(studio, /disabled=\{busy !== null\}/, 'resume generation must remain clickable when setup details are missing');
assert.match(studio, /fullNameRequired/, 'resume generation must explain when the applicant name is missing');
assert.match(memberLayout, /MemberRouteBoundary/, 'a member-page exception must not leave the workspace blank');
assert.match(list, /\/api\/resumes/, 'resume list must load user-owned documents');
assert.match(list, /method: 'DELETE'/, 'resume list must allow deletion');
assert.match(list, /aria-label=\{copy\.list\.delete\}/, 'resume list deletion must be an accessible icon action');

const profile = normaliseCareerProfile({
  personal: { fullName: 'Ada Lovelace', email: 'ada@example.test', targetRole: 'AI Engineer' },
  skills: ['Python', 'Machine Learning'],
  experience: [{ company: 'Analytical Engines', title: 'Engineer', description: 'Built verified prototypes.' }],
});
const generated = fallbackGeneratedDocument(profile, { id: 'template', name: 'AI', targetRole: 'AI Engineer', selectedSkills: ['Python'] }, 'Python is required.', 'Example Co', 'AI Engineer', 'fr', ['Python']);
assert.equal(generated.document.contact.fullName, 'Ada Lovelace');
assert.deepEqual(generated.document.skills, ['Python']);
assert.equal(generated.match.score, 100);
assert.equal(generated.document.outputLocale, 'fr', 'a generated resume must retain its output language for export headings');

const responsibilitySnippets = jobResponsibilitySnippets('Responsibilities:\n• Build reliable AI agents for customers.\n• Design secure evaluation workflows.');
assert.deepEqual(responsibilitySnippets, ['Build reliable AI agents for customers.', 'Design secure evaluation workflows.']);

const nativeFetch = globalThis.fetch;
const requestedModels: string[] = [];
const requestedPayloads: Array<{ messages?: Array<{ content?: unknown }> }> = [];
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  const request = JSON.parse(String(init?.body ?? '{}')) as { model?: string; messages?: Array<{ content?: unknown }> };
  requestedModels.push(request.model ?? '');
  requestedPayloads.push(request);
  const deepSeekResponse = {
    personal: { fullName: 'Ada Lovelace', email: 'ada@example.test' },
    skills: ['Python'],
  };
  const gptResponse = {
    personal: { fullName: 'Ada Lovelace', email: 'ada@example.test', phone: '+1 555 0100' },
    summary: 'Engineer with verified analytical computing experience.',
    skills: ['Python', 'TypeScript', 'React', 'SQL', 'Machine Learning'],
    experience: [{ company: 'Analytical Engines', title: 'Engineer', bullets: ['Built verified prototypes.'] }],
  };
  const content = requestedModels.length === 1 ? deepSeekResponse : gptResponse;
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}) as typeof fetch;
try {
  const file = new File(['Ada Lovelace resume source'], 'ada.pdf', { type: 'application/pdf' });
  const extraction = await extractCareerFactsFromUpload({
    LLM_DEEPSEEK_API: 'test-deepseek-key',
    LLM_MEGANOVA_API: 'test-meganova-key',
  } as Env, file, 'pdf', 'Ada Lovelace\nada@example.test\nPython\nTypeScript\nReact\nSQL\nMachine Learning\nAnalytical Engines');
  assert.equal(extraction.provider, 'gpt', 'GPT must retry when DeepSeek returns fewer than ten usable facts');
  assert.equal(extraction.note, 'gpt_second_pass', 'the stored source must record the automatic GPT second pass');
  assert.ok(careerFactCount(extraction.facts) >= 10, 'the GPT extraction must retain the richer fact set');
  assert.deepEqual(requestedModels, ['deepseek-chat', 'openai/gpt-5.4'], 'DeepSeek must run first and GPT-5.4 must be the second-pass model');
  assert.equal(typeof requestedPayloads[0]?.messages?.[1]?.content, 'string', 'PDF facts must be extracted from plain text, not a file attachment');
  assert.match(String(requestedPayloads[0]?.messages?.[1]?.content), /RESUME TEXT:/, 'PDF text must be passed to DeepSeek explicitly');
  assert.doesNotMatch(JSON.stringify(requestedPayloads[0]), /image_url|data:application\/pdf/i, 'the original PDF must never be sent to the LLM');
} finally {
  globalThis.fetch = nativeFetch;
}

const stream = deflateSync(Buffer.from('BT (Ada Lovelace) Tj ET', 'latin1'));
const header = Buffer.from(`%PDF-1.4\n<< /Filter /FlateDecode /Length ${stream.length} >>\nstream\n`, 'latin1');
const footer = Buffer.from('\nendstream\n%%EOF', 'latin1');
const compressedPdfText = await extractPdfText(new Uint8Array(Buffer.concat([header, stream, footer])));
assert.match(compressedPdfText, /Ada Lovelace/, 'compressed PDF text must be extracted before AI analysis');
const uploadedPdfText = await extractFileText(new File([Buffer.concat([header, stream, footer])], 'ada.pdf', { type: 'application/pdf' }), 'pdf');
assert.match(uploadedPdfText, /Ada Lovelace/, 'the upload pipeline must extract PDF text before the LLM stage');

const nativeGenerationFetch = globalThis.fetch;
globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
  title: 'AI Engineer',
  summary: 'Engineer with verified analytical computing experience.',
  experience: [{ sourceIndex: 0, tailoredDescription: 'Built verified prototypes at Analytical Engines, applying documented Python experience to support reliable analytical computing work.' }],
  projects: [],
  coverLetter: 'Dear Hiring Team,\n\nI am applying with verified experience relevant to this role.\n\nSincerely,\nAda Lovelace',
  matchedSkills: ['Python'],
}) } }] }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
try {
  const tailored = await generateResumeWithDeepSeek(
    { LLM_DEEPSEEK_API: 'test-deepseek-key' } as Env,
    profile,
    { id: 'template', name: 'AI', targetRole: 'AI Engineer', selectedSkills: ['Python'] },
    'Responsibilities: Build reliable AI systems.',
    'Example Co',
    'AI Engineer',
    'en',
    ['Python'],
  );
  assert.equal(tailored.document.generatedBy, 'deepseek', 'configured DeepSeek must generate a tailored version');
  assert.deepEqual(tailored.document.experience[0]?.bullets, ['Built verified prototypes at Analytical Engines, applying documented Python experience to support reliable analytical computing work.'], 'a tailored description must become the displayed experience paragraph');
} finally {
  globalThis.fetch = nativeGenerationFetch;
}

console.log('Resume-generator verification passed.');
