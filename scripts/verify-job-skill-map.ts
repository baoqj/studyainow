import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { classifyJobUrlResponse, findSkillMatches, htmlToPlainText, isAiRelevantJob, officialAtsEndpoint, officialStructuredBoardEndpoint, sourceInputFromRequest, suspectedExpiryAt, validateBoardToken } from '../functions/_lib/jobs';
import { jobRichTextFromValue, jobRichTextToPlainText, parseJobRichText } from '../functions/_lib/jobRichText';
import { normalizeJobLocation, normalizeJobLocations } from '../functions/_lib/jobGeo';
import { clampInt } from '../functions/_lib/http';
import { cityAliasesForSlug, citySlugFor, isRegionOnlyLocation, localizeCity, localizeCountry } from '../shared/jobLocations';

const migration = readFileSync(new URL('../migrations/0008_job_skills_map.sql', import.meta.url), 'utf8');
const scheduleMigration = readFileSync(new URL('../migrations/0009_job_full_jd_and_schedule.sql', import.meta.url), 'utf8');
const geographyMigration = readFileSync(new URL('../migrations/0010_job_geography.sql', import.meta.url), 'utf8');
const publicationMigration = readFileSync(new URL('../migrations/0012_publish_automated_job_postings.sql', import.meta.url), 'utf8');
const geographyBackfillMigration = readFileSync(new URL('../migrations/0013_backfill_job_geography.sql', import.meta.url), 'utf8');
const richTextMigration = readFileSync(new URL('../migrations/0014_job_rich_text.sql', import.meta.url), 'utf8');
const chinaSourceMigration = readFileSync(new URL('../migrations/0015_china_official_jobs_and_skill_aliases.sql', import.meta.url), 'utf8');
const hengqinMigration = readFileSync(new URL('../migrations/0016_backfill_hengqin_geography.sql', import.meta.url), 'utf8');
const canadaSourceMigration = readFileSync(new URL('../migrations/0019_canada_ai_official_sources.sql', import.meta.url), 'utf8');
const bookmarksMigration = readFileSync(new URL('../migrations/0023_user_job_bookmarks.sql', import.meta.url), 'utf8');
const evidenceReindexMigration = readFileSync(new URL('../migrations/0024_job_skill_phrase_reindex.sql', import.meta.url), 'utf8');
const directUrlExpiryMigration = readFileSync(new URL('../migrations/0025_direct_job_url_expiry.sql', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const jobsLibrary = readFileSync(new URL('../functions/_lib/jobs.ts', import.meta.url), 'utf8');
const jobDetailPage = readFileSync(new URL('../src/pages/JobDetail.tsx', import.meta.url), 'utf8');
const jobsPage = readFileSync(new URL('../src/pages/Jobs.tsx', import.meta.url), 'utf8');
const jobsApi = readFileSync(new URL('../functions/api/jobs/index.ts', import.meta.url), 'utf8');
const bookmarksApi = readFileSync(new URL('../functions/api/jobs/bookmarks.ts', import.meta.url), 'utf8');
const bookmarkApi = readFileSync(new URL('../functions/api/jobs/[slug]/bookmark.ts', import.meta.url), 'utf8');
const myJobsPage = readFileSync(new URL('../src/pages/user/MyJobs.tsx', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');

for (const table of ['companies', 'job_sources', 'crawl_runs', 'raw_job_snapshots', 'job_postings', 'job_versions', 'job_sections', 'skills', 'skill_aliases', 'lesson_skill_coverage', 'job_skill_evidence', 'job_reviews']) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`), `missing ${table}`);
}
for (const route of ["'claude-code-guide', '3', '03-02'", "'hermes-agent-guide', '14', '14-03'", "'codex-tutorial', '11', '11-04'"]) {
  assert.ok(migration.includes(route), `expected reviewed course mapping ${route}`);
}
assert.match(worker, /key\.startsWith\('jobs\/raw\/'\)/, 'private raw job snapshots must not be content-proxied');
assert.match(worker, /async scheduled\(controller, env/, 'Worker must export a scheduled synchronization handler');
assert.match(worker, /runDueSourceSync\(env\)/, 'Scheduled handler must run due job sources');
assert.match(jobsLibrary, /jobRichTextFromValue/, 'Future ATS ingestion must normalize source content to constrained rich text');
assert.match(jobsLibrary, /rich_content_json/, 'Future ATS ingestion must persist constrained rich text');
assert.match(jobsLibrary, /reindexCurrentJobSkillEvidence/, 'Approved aliases must support resumable evidence remapping for current JDs');
assert.match(jobsLibrary, /inspectDueJobUrls/, 'Expiry must be driven by direct original JD URL inspection');
assert.doesNotMatch(jobsLibrary, /markMissingSourceJobs/, 'A changing source catalogue must never expire an existing JD');
assert.match(jobsLibrary, /baidu-social/, 'The approved mainland China official board must have a fixed endpoint');
assert.match(jobsLibrary, /structured_data/, 'Cron must include approved structured official sources');
assert.doesNotMatch(jobDetailPage, /dangerouslySetInnerHTML/, 'React job rendering must never inject raw source HTML');
assert.match(jobsPage, /scopeValue\(country, city\)/, 'Jobs UI must maintain a two-level country-city selection scope');
assert.doesNotMatch(jobsPage, /scope\.get\('region'\)/, 'Jobs UI must not expose a province/state selector level');
assert.match(jobsPage, /function filterByCompany\(companyName: string\)/, 'A job-card company control must initiate a company-name filter');
assert.match(jobsPage, /applyFilters\(\{ query: companyName, country: '', city: '', remote: '' \}\)/, 'Company filtering must execute the existing partial company-name search');
assert.match(jobsPage, /border border-primary bg-surface-container-lowest/, 'The light-mode company control must use a white surface with a primary outline');
assert.match(jobsPage, /async function loadMore\(\)/, 'The job catalogue must support loading all pages for a company filter');
assert.match(jobsPage, /useSearchParams/, 'The jobs catalogue must honor a shareable company query in the URL');
assert.match(jobsPage, /searchParamsFromFilters/, 'Every visible jobs filter must synchronize to a shareable URL query');
assert.match(jobsPage, /searchParams\.get\('kw'\)/, 'The jobs catalogue must accept the public keyword parameter name');
assert.match(jobsPage, /china: 'CN'/, 'The jobs catalogue must accept readable country query values');
assert.match(jobsPage, /localizeCity/, 'The jobs catalogue must localize city labels at render time');
assert.match(jobsPage, /localizeCountry/, 'The jobs catalogue must localize country labels at render time');
assert.match(jobDetailPage, /function companyJobsPath\(companyName: string\)/, 'Job details must link the company control to the catalogue filter');
assert.match(jobDetailPage, /new URLSearchParams\(\{ kw: companyName \}\)/, 'Job-detail company links must use the public keyword parameter');
assert.match(jobDetailPage, /border border-primary bg-surface-container-lowest/, 'The job-detail company control must match the white outlined company button style');
assert.match(jobsApi, /cityAliasesForSlug/, 'Jobs API must map stable city URL keys to official-source aliases');
assert.doesNotMatch(jobsApi, /regions:/, 'Jobs API must not return a third province/state selector level');
assert.match(jobsApi, /url\.searchParams\.get\('offset'\)/, 'Jobs API must accept an offset for subsequent result pages');
assert.match(jobsApi, /nextOffset/, 'Jobs API must provide pagination metadata for the catalogue');
assert.match(wrangler, /"0 0,12 \* \* \*"/, 'Worker must retain the twice-daily job-sync trigger');
assert.match(worker, /inspectDueJobUrls\(env, 48, true\)/, 'The two-minute task may only advance the initial URL-inspection backfill');
assert.match(worker, /inspectDueJobUrls\(env, 48\)/, 'Scheduled crawling must run a bounded direct URL inspection after source sync');
assert.match(jobsLibrary, /initialOnly = false/, 'Routine expiry checks must distinguish due URL inspections from the initial backfill');
assert.match(bookmarksMigration, /CREATE TABLE IF NOT EXISTS user_job_bookmarks/, 'job bookmarks must be persisted per user');
assert.match(bookmarksMigration, /PRIMARY KEY \(user_id, job_id\)/, 'a user may save a job only once');
assert.match(worker, /\/api\/jobs\/bookmarks/, 'Worker must expose the saved-jobs list endpoint');
assert.match(worker, /jobBookmarkMatch/, 'Worker must expose per-job bookmark writes');
assert.match(bookmarkApi, /requireUser/, 'bookmark writes must require the current user');
assert.match(bookmarksApi, /user_job_bookmarks/, 'My Jobs must only query the current user bookmarks');
assert.match(jobsPage, /BookmarkButton/, 'job cards must render a bookmark action');
assert.match(jobDetailPage, /BookmarkButton/, 'job details must render a bookmark action');
assert.match(myJobsPage, /fetchBookmarkedJobs/, 'My Jobs must load saved JD records rather than the public catalogue');
assert.match(scheduleMigration, /display_policy = 'full_text_authorized'/, 'Existing sources must display full source-language JD text');
assert.match(scheduleMigration, /polling_minutes = 720/, 'Existing sources must poll twice daily');
assert.match(geographyMigration, /CREATE TABLE IF NOT EXISTS job_locations/, 'Job geography must be stored in D1');
assert.match(geographyMigration, /country_code/, 'Job geography must include the country code');
assert.match(publicationMigration, /Published existing official ATS job feed/, 'Existing official ATS jobs must become publicly visible');
assert.match(geographyBackfillMigration, /Dublin, IE/, 'Legacy Dublin jobs must be classified as Ireland');
assert.match(geographyBackfillMigration, /San Francisco, CA/, 'Legacy United States jobs must be classified by their state location');
assert.match(richTextMigration, /rich_content_json/, 'Job sections must persist constrained rich content separately from plain text');
assert.match(richTextMigration, /job_rich_text_backfill_state/, 'Legacy conversion must be resumable and lock protected');
assert.match(evidenceReindexMigration, /job_skill_evidence_reindex_state/, 'Phrase expansion must schedule a resumable current-JD evidence reindex');
assert.match(evidenceReindexMigration, /multi-agent workflows/, 'Agent role phrases must map to the reviewed multi-agent skill');
assert.match(directUrlExpiryMigration, /original_source_url/, 'Every JD must retain its immutable original source URL');
assert.match(directUrlExpiryMigration, /collected_at/, 'Every JD must retain its latest direct-source collection date');
assert.match(directUrlExpiryMigration, /suspected_expired_at/, 'Every JD must store its direct-inspection eligibility date');
assert.match(directUrlExpiryMigration, /status = 'published'/, 'The initial lifecycle reset must make existing JDs valid before direct inspection');
assert.equal(officialAtsEndpoint('greenhouse', 'acme'), 'https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true');
assert.equal(officialAtsEndpoint('lever', 'acme'), 'https://api.lever.co/v0/postings/acme?mode=json');
assert.equal(officialAtsEndpoint('ashby', 'acme'), 'https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=false');
assert.equal(officialStructuredBoardEndpoint('baidu-social'), 'https://talent.baidu.com/jobs/social-list');
assert.throws(() => officialStructuredBoardEndpoint('unreviewed-board'), /not supported/);
assert.throws(() => validateBoardToken('../../private-network'), /boardToken/);
assert.equal(sourceInputFromRequest({ sourceType: 'lever', boardToken: 'acme', officialCareerUrl: 'https://jobs.example.com' }).displayPolicy, 'full_text_authorized');
assert.equal(sourceInputFromRequest({ sourceType: 'json_ld', boardToken: 'baidu-social', officialCareerUrl: 'https://talent.baidu.com/jobs/social' }).endpointUrl, 'https://talent.baidu.com/jobs/social-list');
assert.equal(suspectedExpiryAt('2026-01-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'), '2026-04-19T00:00:00.000Z', 'A newly collected older JD must wait a full collection month');
assert.equal(suspectedExpiryAt('2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z'), '2026-05-30T00:00:00.000Z', 'A recent publication must retain the 90-day publication window');
assert.equal(classifyJobUrlResponse(200, '<title>Senior AI Engineer</title>', 'Senior AI Engineer', null), 'active');
assert.equal(classifyJobUrlResponse(404, '', 'Senior AI Engineer', null), 'missing');
assert.equal(classifyJobUrlResponse(200, 'This position is no longer available.', 'Senior AI Engineer', null), 'missing');
assert.equal(classifyJobUrlResponse(200, '<title>Careers</title>', 'Senior AI Engineer', null), 'inconclusive', 'A generic careers page must not refresh the collection date');
assert.equal(isAiRelevantJob('Senior Machine Learning Engineer', 'Build reliable production systems.'), true, 'AI-specific titles must be retained');
assert.equal(isAiRelevantJob('Member of Technical Staff, Pre-Training Data', 'Build reliable production systems.'), true, 'Model pre-training titles must be retained');
assert.equal(isAiRelevantJob('Software Engineer', 'About us: we build AI.\n\nYou will optimize model inference and machine learning workloads.'), true, 'Two job-specific AI signals must retain AI infrastructure roles');
assert.equal(isAiRelevantJob('People Operations Manager', 'About us: we build safe artificial intelligence and machine learning systems.\n\nYou will manage employee onboarding and benefits.'), false, 'Company AI boilerplate must not retain unrelated jobs');
assert.equal(htmlToPlainText('<p>Build <strong>agentic workflows</strong>.</p><script>alert(1)</script>'), 'Build agentic workflows.');
const exactPhraseMatches = findSkillMatches('Build AI agents, agentic systems, multi-agent workflows, and agent systems.', [
  { id: 'short', skill_id: 'agentic', alias: 'agent system', match_type: 'phrase', name_zh: '', name_en: '' },
  { id: 'plural', skill_id: 'agentic', alias: 'agent systems', match_type: 'phrase', name_zh: '', name_en: '' },
  { id: 'agentic', skill_id: 'agentic', alias: 'agentic systems', match_type: 'phrase', name_zh: '', name_en: '' },
  { id: 'multi', skill_id: 'multi-agent', alias: 'multi-agent workflows', match_type: 'phrase', name_zh: '', name_en: '' },
  { id: 'ai-agents', skill_id: 'agentic', alias: 'AI agents', match_type: 'phrase', name_zh: '', name_en: '' },
]);
assert.deepEqual(exactPhraseMatches.map((match) => match.alias), ['AI agents', 'agentic systems', 'multi-agent workflows', 'agent systems'], 'English phrase aliases must prefer exact complete skill phrases over a shorter substring');
const richDocument = jobRichTextFromValue('<h1>About <strong>AI</strong></h1><p>Build <a href="https://example.com">agentic workflows</a>.</p><ul><li>Python</li><li><img src=x onerror=alert(1)>LLMs</li></ul><script>alert(1)</script><a href="javascript:alert(1)">blocked</a>');
assert.deepEqual(richDocument, {
  version: 1,
  blocks: [
    { type: 'heading', level: 2, children: [{ type: 'text', text: 'About ' }, { type: 'bold', children: [{ type: 'text', text: 'AI' }] }] },
    { type: 'paragraph', children: [{ type: 'text', text: 'Build ' }, { type: 'link', href: 'https://example.com/', children: [{ type: 'text', text: 'agentic workflows' }] }, { type: 'text', text: '.' }] },
    { type: 'list', ordered: false, items: [[{ type: 'text', text: 'Python' }], [{ type: 'text', text: 'LLMs' }]] },
    { type: 'paragraph', children: [{ type: 'text', text: 'blocked' }] },
  ],
});
assert.equal(jobRichTextToPlainText(richDocument), 'About AI\n\nBuild agentic workflows.\n\n• Python\n• LLMs\n\nblocked');
const offsetStableDocument = jobRichTextFromValue('<ul><li>First item</li><li>agent systems </li></ul><p>multi-agent workflows </p>');
assert.equal(jobRichTextToPlainText(offsetStableDocument), '• First item\n• agent systems\n\nmulti-agent workflows', 'Rich-text leaves must trim exactly as the canonical offset text does');
assert.equal(JSON.stringify(richDocument).includes('onerror'), false, 'Unsafe HTML attributes must never enter rich-text JSON');
assert.equal(JSON.stringify(richDocument).includes('javascript:'), false, 'Unsafe link protocols must never enter rich-text JSON');
const escapedAtsDocument = jobRichTextFromValue('&lt;div class="content-intro"&gt;&lt;h2&gt;&lt;strong&gt;About Anthropic&lt;/strong&gt;&lt;/h2&gt;&lt;p&gt;Build &amp;amp; operate safe systems.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;&lt;p&gt;Run full lifecycle recruiting&lt;/p&gt;&lt;/li&gt;&lt;/ul&gt;&lt;/div&gt;');
assert.deepEqual(escapedAtsDocument, {
  version: 1,
  blocks: [
    { type: 'heading', level: 2, children: [{ type: 'bold', children: [{ type: 'text', text: 'About Anthropic' }] }] },
    { type: 'paragraph', children: [{ type: 'text', text: 'Build & operate safe systems.' }] },
    { type: 'list', ordered: false, items: [[{ type: 'text', text: 'Run full lifecycle recruiting' }]] },
  ],
});
assert.equal(JSON.stringify(escapedAtsDocument).includes('content-intro'), false, 'Encoded ATS markup must become constrained blocks, not literal text');
assert.deepEqual(parseJobRichText(JSON.stringify(richDocument)), richDocument, 'Stored rich text must be validated before it is returned to React');
assert.match(jobDetailPage, /section\.text\.slice\(item\.start, item\.end\) === item\.phrase/, 'The client must reject an annotation whose offset no longer matches its stored evidence phrase');
assert.match(jobDetailPage, /if \(itemIndex > 0\) cursor\.value \+= 1/, 'The rich-text renderer must count canonical newlines between list items');
assert.equal(parseJobRichText('{"version":1,"blocks":[{"type":"paragraph","children":[{"type":"link","href":"javascript:alert(1)","children":[]}]}]}'), null, 'Malformed stored rich text must be rejected');
assert.equal(clampInt(null, 1, 50, 24), 24, 'An omitted API limit must use the documented default instead of returning one row');
assert.equal(clampInt('24', 1, 50, 24), 24);
assert.equal(clampInt('500', 1, 50, 24), 50);
assert.equal(citySlugFor('US', 'New York City'), 'new-york');
assert.deepEqual(cityAliasesForSlug('US', 'new-york'), ['new-york', 'New York', 'New York City']);
assert.equal(localizeCity('US', 'San Francisco', 'zh-CN'), '旧金山');
assert.equal(localizeCity('US', 'San Francisco', 'zh-TW'), '三藩市');
assert.equal(localizeCountry('TW', 'zh-TW'), '臺灣');
assert.equal(localizeCountry('GB', 'fr'), 'Royaume-Uni');
assert.equal(isRegionOnlyLocation('CA', 'Ontario'), true);
assert.equal(isRegionOnlyLocation('US', 'New York'), false);
assert.deepEqual(normalizeJobLocation('Toronto, Ontario, Canada'), {
  rawText: 'Toronto, Ontario, Canada', countryCode: 'CA', countryName: 'Canada', regionName: 'Ontario', cityName: 'Toronto',
  isRemote: false, confidence: 0.82, source: 'location_text',
});
assert.deepEqual(normalizeJobLocation('Remote — United States'), {
  rawText: 'Remote — United States', countryCode: 'US', countryName: 'United States', regionName: null, cityName: null,
  isRemote: true, confidence: 0.9, source: 'location_text',
});
const ambiguousLocation = normalizeJobLocation('San Francisco, CA');
assert.equal(ambiguousLocation?.countryCode, 'US', 'A recognised United States state code must establish the country');
assert.equal(ambiguousLocation?.regionName, 'California');
assert.equal(ambiguousLocation?.cityName, 'San Francisco');
assert.equal(normalizeJobLocation('Dublin, IE')?.countryCode, 'IE');
assert.deepEqual(normalizeJobLocation('深圳市'), {
  rawText: '深圳市', countryCode: 'CN', countryName: 'China', regionName: '广东省', cityName: '深圳市',
  isRemote: false, confidence: 0.82, source: 'location_text',
});
assert.deepEqual(normalizeJobLocation('横琴粤澳深度合作区'), {
  rawText: '横琴粤澳深度合作区', countryCode: 'CN', countryName: 'China', regionName: '广东省', cityName: '珠海市',
  isRemote: false, confidence: 0.82, source: 'location_text',
});
assert.deepEqual(normalizeJobLocation('Toronto, ON'), {
  rawText: 'Toronto, ON', countryCode: 'CA', countryName: 'Canada', regionName: 'Ontario', cityName: 'Toronto',
  isRemote: false, confidence: 0.82, source: 'location_text',
});
assert.deepEqual(normalizeJobLocation({ addressLocality: 'Toronto', addressRegion: 'Ontario', addressCountry: 'Canada' }), {
  rawText: 'Toronto, Ontario, Canada', countryCode: 'CA', countryName: 'Canada', regionName: 'Ontario', cityName: 'Toronto',
  isRemote: false, confidence: 1, source: 'structured_source',
});
assert.deepEqual(normalizeJobLocations(['北京市,上海市']), [
  { rawText: '北京市', countryCode: 'CN', countryName: 'China', regionName: '北京市', cityName: '北京市', isRemote: false, confidence: 0.82, source: 'location_text' },
  { rawText: '上海市', countryCode: 'CN', countryName: 'China', regionName: '上海市', cityName: '上海市', isRemote: false, confidence: 0.82, source: 'location_text' },
]);
assert.match(chinaSourceMigration, /source_baidu_social_structured/, 'Baidu must be enabled as the first mainland-China official source');
assert.match(chinaSourceMigration, /检索增强生成/, 'Chinese skill aliases must support source-language evidence');
assert.match(hengqinMigration, /横琴粤澳深度合作区/, 'The first China sync geography correction must be durable');
assert.match(canadaSourceMigration, /source_cohere_ashby/, 'Cohere must be registered as a Canada-focused official ATS source');
assert.match(canadaSourceMigration, /polling_minutes[\s\S]*720/, 'Cohere must follow the twice-daily source cadence');
assert.deepEqual(normalizeJobLocations(['San Francisco, CA | New York City, NY']), [
  { rawText: 'San Francisco, CA', countryCode: 'US', countryName: 'United States', regionName: 'California', cityName: 'San Francisco', isRemote: false, confidence: 0.82, source: 'location_text' },
  { rawText: 'New York City, NY', countryCode: 'US', countryName: 'United States', regionName: 'New York', cityName: 'New York City', isRemote: false, confidence: 0.82, source: 'location_text' },
]);

console.log('Job skill-map verification passed.');
