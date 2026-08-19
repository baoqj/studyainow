// Verifies the interview question bank content used by the /interviews unit.
// Content lives outside the git repo at ../../Interview/... (private content).
// Checks per locale (en, zh-CN, zh-TW, fr, es):
//   - all six level files exist and are non-empty
//   - each file has exactly 6 question sections and the at-a-glance table
//   - each question has exactly 7 ordered ### sections
//   - code fences are balanced
//   - every python code block is byte-identical to the English source
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const codeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bankRoot = resolve(codeRoot, '../Interview/ai_engineering_progressive_assessment_levels_1_6/locales');
const locales = ['en', 'zh-CN', 'zh-TW', 'fr', 'es'];
const levels = [1, 2, 3, 4, 5, 6];

function codeBlocks(raw) {
  const blocks = [];
  const lines = raw.split('\n');
  let current = null;
  for (const line of lines) {
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      if (current) {
        current.lines.push(line);
        blocks.push(current.lines.join('\n'));
        current = null;
      } else {
        current = { language: fence[1] ?? 'text', lines: [line] };
      }
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current.lines.join('\n')); // unbalanced fence content
  return blocks;
}

function questionBlocks(raw) {
  return [...raw.matchAll(/^##\s+Question\s+(\d+)\s*[—–-]\s*(.+)$/gm)].map((match) => ({
    number: Number(match[1]),
    start: (match.index ?? 0) + match[0].length,
  }));
}

function sectionCount(questionRaw) {
  return [...questionRaw.matchAll(/^###\s+/gm)].length;
}

const failures = [];
const summary = [];

for (const locale of locales) {
  for (const level of levels) {
    const file = resolve(bankRoot, locale, `Level-${level}-Practice-Problems.md`);
    let raw = '';
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      failures.push(`${locale}/Level-${level}: file missing`);
      continue;
    }
    const blocks = questionBlocks(raw);
    if (blocks.length !== 6) failures.push(`${locale}/Level-${level}: expected 6 questions, found ${blocks.length}`);
    // Section order is structural (not heading text): 0 difficulty profile,
    // 1 what this level assesses, 2 at-a-glance table, 3..8 questions.
    const h2s = [...raw.matchAll(/^##\s+(.+)$/gm)].map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = [...raw.matchAll(/^##\s+(.+)$/gm)][index + 1]?.index ?? raw.length;
      return raw.slice(start, end);
    });
    if (h2s.length !== 9) failures.push(`${locale}/Level-${level}: expected 9 H2 sections, found ${h2s.length}`);
    const glance = h2s[2] ?? '';
    if (!glance.includes('|')) failures.push(`${locale}/Level-${level}: at-a-glance section has no table`);
    const questionChunks = blocks.map((block, index) => {
      const end = blocks[index + 1]?.start ?? raw.length;
      return raw.slice(block.start, end);
    });
    questionChunks.forEach((chunk, index) => {
      const sections = sectionCount(chunk);
      if (sections !== 7) failures.push(`${locale}/Level-${level} Q${index + 1}: expected 7 sections, found ${sections}`);
    });
    const fences = (raw.match(/^```/gm) ?? []).length;
    if (fences % 2 !== 0) failures.push(`${locale}/Level-${level}: unbalanced code fences (${fences})`);
    if (locale !== 'en') {
      const enRaw = await readFile(resolve(bankRoot, 'en', `Level-${level}-Practice-Problems.md`), 'utf8');
      const enBlocks = codeBlocks(enRaw);
      const localeBlocks = codeBlocks(raw);
      if (enBlocks.length !== localeBlocks.length) {
        failures.push(`${locale}/Level-${level}: code block count ${localeBlocks.length} != en ${enBlocks.length}`);
      } else {
        localeBlocks.forEach((block, index) => {
          if (block !== enBlocks[index]) failures.push(`${locale}/Level-${level}: code block ${index + 1} differs from English source`);
        });
      }
    }
  }
  summary.push(`${locale}: 6 levels x 6 questions verified`);
}

if (failures.length) {
  console.error(`Interview content verification FAILED (${failures.length} issues):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Interview content verification passed.');
for (const line of summary) console.log(`  ${line}`);
