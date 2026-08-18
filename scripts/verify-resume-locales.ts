import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { APP_LOCALES } from '../src/i18n';
import { getResumeCopy } from '../src/data/resumeCopy';

function visit(value: unknown, path = 'resumeCopy') {
  if (typeof value === 'string') {
    assert.ok(value.trim(), `${path} must have a translated value`);
    return;
  }
  assert.ok(value && typeof value === 'object', `${path} must be a string or object`);
  for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
}

for (const locale of APP_LOCALES) visit(getResumeCopy(locale.code));

const studio = readFileSync(new URL('../src/pages/user/ResumeStudio.tsx', import.meta.url), 'utf8');
const list = readFileSync(new URL('../src/pages/user/ResumeList.tsx', import.meta.url), 'utf8');
assert.match(studio, /getResumeCopy/, 'ResumeStudio must read the locale-specific copy');
assert.match(studio, /jobSelectorCopy: Record<AppLocale/, 'saved-job selector and output-language controls must define all five localized variants');
for (const locale of APP_LOCALES) assert.match(studio, new RegExp(`(?:'${locale.code}'|${locale.code})\\s*:`), `missing saved-job UI translation for ${locale.code}`);
assert.match(studio, /exportDocx\(previewVersion, copy\)/, 'DOCX headings must use the selected locale');
assert.match(studio, /exportPdf\(previewVersion, copy\)/, 'PDF headings must use the selected locale');
assert.match(studio, /exportMarkdown\(previewVersion, copy\)/, 'Markdown headings must use the selected locale');
assert.match(list, /getResumeCopy/, 'ResumeList must read the locale-specific copy');
assert.match(list, /copy\.list/, 'resume list labels must use the selected locale');

console.log('Resume locale verification passed.');
