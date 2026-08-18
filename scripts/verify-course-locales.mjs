#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const sourceRoot = path.join(projectRoot, 'Course');
const locales = ['zh-TW', 'en', 'fr', 'es'];
// Course/15 is an explicitly zh-CN curriculum and is loaded as a canonical
// fallback in every UI locale. Only courses with authored locale trees belong
// in the translation parity check.
const canonicalOnlyDirectories = new Set(['15', 'xueai']);
const forbiddenTraditionalTerms = [
  '軟件', '人工智能', '打印機', '打印', '文件夾', '文件', '數據庫', '數據', '服務器', '默認',
  '賬號', '登錄', '代碼', '源碼', '用戶', '網絡', '插件', '模塊', '內存', '硬盤', '兼容', '優化', '智能體',
];

async function listMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    if (entry.name === 'locales' || entry.name === 'pics' || (directory === sourceRoot && canonicalOnlyDirectories.has(entry.name))) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listMarkdown(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) output.push(entryPath);
  }
  return output;
}

const sourceFiles = await listMarkdown(sourceRoot);
let failures = 0;

for (const locale of locales) {
  const missing = [];
  for (const sourceFile of sourceFiles) {
    const relative = path.relative(sourceRoot, sourceFile);
    const target = path.join(sourceRoot, 'locales', locale, relative);
    try {
      const source = await readFile(sourceFile, 'utf8');
      const content = await readFile(target, 'utf8');
      if (!content.trim()) missing.push(`${relative} (empty)`);
      if ((source.match(/```/g)?.length ?? 0) !== (content.match(/```/g)?.length ?? 0)) {
        missing.push(`${relative} (code fence count changed)`);
      }
      if (locale === 'zh-TW') {
        const prose = content.replace(/```[\s\S]*?```/g, '');
        const badTerms = forbiddenTraditionalTerms.filter((term) => prose.includes(term));
        if (badTerms.length) missing.push(`${relative} (non-localised terms: ${badTerms.join(', ')})`);
      }
      if (locale !== 'zh-TW' && /\[[^\]]*[\u4e00-\u9fff][^\]]*\]\(/.test(content)) {
        missing.push(`${relative} (untranslated Markdown link label)`);
      }
    } catch {
      missing.push(relative);
    }
  }

  if (missing.length) {
    failures += missing.length;
    console.error(`${locale}: ${missing.length} missing or invalid locale files`);
    for (const item of missing.slice(0, 20)) console.error(`  ${item}`);
  } else {
    console.log(`${locale}: ${sourceFiles.length}/${sourceFiles.length} Markdown files verified`);
  }
}

if (failures) process.exitCode = 1;
