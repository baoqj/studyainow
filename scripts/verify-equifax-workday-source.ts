import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { isAiRelevantJob, normalizePayload, officialStructuredBoardEndpoint } from '../functions/_lib/jobs';

const migration = readFileSync(new URL('../migrations/0040_equifax_workday_source.sql', import.meta.url), 'utf8');
const jobsLibrary = readFileSync(new URL('../functions/_lib/jobs.ts', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');

assert.equal(
  officialStructuredBoardEndpoint('equifax-workday'),
  'https://equifax.wd5.myworkdayjobs.com/wday/cxs/equifax/External/jobs',
);

const normalized = normalizePayload('json_ld', {
  adapter: 'workday_cxs',
  totalCandidateCount: 1,
  jobs: [{
    listing: {
      title: 'Agentic AI Optimization Developer',
      externalPath: '/job/CAN---Ontario---Toronto/Agentic-AI-Optimization-Developer_J00178408',
      locationsText: 'CAN - Ontario - Toronto',
      startDate: '2026-08-28',
      bulletFields: ['J00178408'],
    },
    posting: {
      id: 'workday-posting-id',
      title: 'Agentic AI Optimization Developer',
      jobDescription: [
        '<p>Build reliable multi-agent systems and automated LLM evaluations.</p>',
        '<p><b>What you will do</b></p>',
        '<ul><li>Develop Python evaluation pipelines, RAG guardrails, and model monitoring.</li></ul>',
        '<p><b>Function:</b></p><p>Function - Tech Dev and Client Services</p>',
      ].join(''),
      jobReqId: 'J00178408',
      startDate: '2026-08-28',
      timeType: 'Full time',
      country: { descriptor: 'Canada' },
      jobRequisitionLocation: {
        descriptor: 'CAN - Ontario - Toronto',
        country: { descriptor: 'Canada', alpha2Code: 'CA' },
      },
      externalUrl: 'https://equifax.wd5.myworkdayjobs.com/External/job/CAN---Ontario---Toronto/Agentic-AI-Optimization-Developer_J00178408',
    },
  }],
}, 'equifax-workday')[0];

assert.equal(normalized.externalJobId, 'J00178408');
assert.equal(normalized.canonicalKey, 'workday:equifax-workday:J00178408');
assert.equal(normalized.sourcePublishedAt, '2026-08-28T00:00:00.000Z');
assert.equal(normalized.employmentType, 'Full time');
assert.equal(normalized.language, 'en');
assert.equal(normalized.locations[0]?.countryCode, 'CA');
assert.equal(normalized.locations[0]?.regionName, 'Ontario');
assert.equal(normalized.locations[0]?.cityName, 'Toronto');
assert.match(normalized.description, /Python evaluation pipelines/);
assert.ok(isAiRelevantJob(normalized.title, normalized.description));
assert.ok(normalized.tags.some((tag) => tag.type === 'employment' && tag.label === 'Full time'));
assert.ok(normalized.tags.some((tag) => tag.type === 'source' && tag.label === 'Workday'));

assert.match(migration, /source_equifax_workday/);
assert.match(migration, /'structured_data', 'excerpt'/);
assert.match(migration, /720, 60/, 'The source must retain the existing twice-daily cadence');
assert.match(jobsLibrary, /searchText: 'AI'/, 'Workday must prefilter the official full-text catalogue');
assert.match(jobsLibrary, /locationCountry:[\s\S]*a30a87ed25634629aa6c3958aa2b91ea[\s\S]*bc33aa3152ec42d4995f4791a106ed09/);
assert.match(jobsLibrary, /runConcurrent\(listings, 4/, 'Detail requests must stay bounded');
assert.match(jobsLibrary, /totalCandidateCount/);
assert.match(worker, /runInitialSourceSync\(env\)/, 'A new source must bootstrap without changing steady-state crawl frequency');
assert.match(wrangler, /crons = \["0 0,12 \* \* \*"/, 'Official source crawling must remain twice daily');

console.log('Equifax Workday source unit verification passed.');
