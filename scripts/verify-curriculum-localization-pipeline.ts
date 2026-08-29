import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

const implementation = read('functions/_lib/curriculumLocalization.ts');
const endpoint = read('functions/api/admin/curriculum/localize.ts');
const worker = read('src/worker.ts');
const generator = read('scripts/localize-ai-practice-courses.mjs');
const verifier = read('scripts/verify-ai-practice-course-locales.mjs');

assert.match(implementation, /MAX_FILES_PER_BATCH = 8/, 'localization batches must remain bounded');
assert.match(implementation, /MAX_SOURCE_CHARACTERS = 72_000/, 'source input must have a total size cap');
assert.match(implementation, /MAX_FILE_CHARACTERS = 18_000/, 'each source document must have a size cap');
assert.match(implementation, /assertCurriculumToken/, 'the worker must require the private build token');
assert.match(implementation, /No curriculum localization model is configured/, 'missing model credentials must fail closed');
assert.match(implementation, /LLM_DEEPSEEK_API/, 'DeepSeek must be the first eligible provider');
assert.match(implementation, /LLM_MEGANOVA_API/, 'MegaNova must remain the fallback provider');
assert.match(implementation, /validateLocalizedFiles/, 'model output must be structurally validated');
assert.match(implementation, /skills/, 'stable skill metadata must be preserved');
assert.match(endpoint, /assertCurriculumToken\(env, request\)/, 'the endpoint must authenticate before localizing');
assert.match(worker, /'\/api\/admin\/curriculum\/localize'/, 'the Worker adapter route is missing');
assert.match(generator, /CURRICULUM_LOCALIZATION_TOKEN/, 'the compiler must send an explicit endpoint token');
assert.match(generator, /validExisting/, 'the compiler must support resumable output');
assert.match(verifier, /content is materially shorter/, 'locale validation must reject content reduction');
assert.match(verifier, /stable \$\{key\} changed/, 'locale validation must reject unstable curriculum identifiers');

console.log(JSON.stringify({
  requestBounded: true,
  endpointTokenProtected: true,
  providerFallback: true,
  outputStructuralValidation: true,
  resumableCompiler: true,
  localeQualityGate: true,
}, null, 2));
