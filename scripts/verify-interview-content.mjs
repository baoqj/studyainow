// Verifies every private interview bank consumed by the /interviews unit.
// Each bank can define its own level and question counts, while sharing the
// seven-section question contract used by the React parser.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const codeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['en', 'zh-CN', 'zh-TW', 'fr', 'es'];
const banks = [
  {
    id: 'ai-engineering-progressive-assessment',
    root: resolve(codeRoot, '../Interview/ai_engineering_progressive_assessment_levels_1_6/locales'),
    levels: [1, 2, 3, 4, 5, 6],
    questionsPerLevel: 6,
  },
  {
    id: 'inference-engine-scheduler',
    root: resolve(codeRoot, '../Interview/inference_engine/locales'),
    levels: [1, 2, 3, 4, 5],
    questionsPerLevel: 1,
    requiredSolutionSymbols: {
      1: 'class Level1Scheduler',
      2: 'class Level2Scheduler',
      3: 'class Level3AScheduler',
      4: 'class Level3BScheduler',
      5: 'class Level3CScheduler',
    },
  },
];

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
        current = { lines: [line] };
      }
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current.lines.join('\n'));
  return blocks;
}

function questionBlocks(raw) {
  return [...raw.matchAll(/^##\s+Question\s+(\d+)\s*[—–-]\s*(.+)$/gm)].map((match) => ({
    number: Number(match[1]),
    headingStart: match.index ?? 0,
    bodyStart: (match.index ?? 0) + match[0].length,
  }));
}

const failures = [];
const summary = [];

for (const bank of banks) {
  for (const locale of locales) {
    for (const level of bank.levels) {
      const label = `${bank.id}/${locale}/Level-${level}`;
      const file = resolve(bank.root, locale, `Level-${level}-Practice-Problems.md`);
      let raw = '';
      try {
        raw = await readFile(file, 'utf8');
      } catch {
        failures.push(`${label}: file missing`);
        continue;
      }

      if (!raw.trim()) failures.push(`${label}: file is empty`);
      if (!/^#\s+.+/m.test(raw)) failures.push(`${label}: missing H1 title`);

      const blocks = questionBlocks(raw);
      if (blocks.length !== bank.questionsPerLevel) {
        failures.push(`${label}: expected ${bank.questionsPerLevel} questions, found ${blocks.length}`);
      }
      blocks.forEach((block, index) => {
        if (block.number !== index + 1) failures.push(`${label}: expected Question ${index + 1}, found Question ${block.number}`);
        const end = blocks[index + 1]?.headingStart ?? raw.length;
        const chunk = raw.slice(block.bodyStart, end);
        const sections = [...chunk.matchAll(/^###\s+/gm)].length;
        if (sections !== 7) failures.push(`${label} Q${block.number}: expected 7 sections, found ${sections}`);
      });

      const h2Matches = [...raw.matchAll(/^##\s+(.+)$/gm)];
      const expectedH2 = 3 + bank.questionsPerLevel;
      if (h2Matches.length !== expectedH2) {
        failures.push(`${label}: expected ${expectedH2} H2 sections, found ${h2Matches.length}`);
      }
      const glanceStart = h2Matches[2] ? (h2Matches[2].index ?? 0) + h2Matches[2][0].length : 0;
      const glanceEnd = h2Matches[3]?.index ?? raw.length;
      if (!raw.slice(glanceStart, glanceEnd).includes('|')) failures.push(`${label}: at-a-glance section has no table`);

      const fences = (raw.match(/^```/gm) ?? []).length;
      if (fences % 2 !== 0) failures.push(`${label}: unbalanced code fences (${fences})`);

      const requiredSymbol = bank.requiredSolutionSymbols?.[level];
      if (requiredSymbol && !raw.includes(requiredSymbol)) failures.push(`${label}: complete solution is missing ${requiredSymbol}`);
      if (bank.id === 'inference-engine-scheduler') {
        const structuralLabels = raw.match(/^\*\*[^*]+\*\*\s*:\s*.+$/gm) ?? [];
        if (structuralLabels.length < 2) failures.push(`${label}: suggested-time and focus labels must use an ASCII colon (French spacing is allowed)`);
      }

      if (locale !== 'en') {
        const enRaw = await readFile(resolve(bank.root, 'en', `Level-${level}-Practice-Problems.md`), 'utf8');
        const enBlocks = codeBlocks(enRaw);
        const localeBlocks = codeBlocks(raw);
        if (enBlocks.length !== localeBlocks.length) {
          failures.push(`${label}: code block count ${localeBlocks.length} != English ${enBlocks.length}`);
        } else {
          localeBlocks.forEach((block, index) => {
            if (block !== enBlocks[index]) failures.push(`${label}: code block ${index + 1} differs from English source`);
          });
        }
      }
    }
    summary.push(`${bank.id}/${locale}: ${bank.levels.length} levels x ${bank.questionsPerLevel} question(s) verified`);
  }
}

if (failures.length) {
  console.error(`Interview content verification FAILED (${failures.length} issues):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Interview content verification passed.');
for (const line of summary) console.log(`  ${line}`);
