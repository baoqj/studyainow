#!/usr/bin/env node

/**
 * Builds locale-specific Markdown copies of the authored Simplified Chinese
 * courses. Code fences, inline code, URLs, frontmatter keys, and product names
 * are protected before translation so a lesson remains executable.
 *
 * Usage:
 *   node scripts/translate-course-content.mjs --locale en
 *   node scripts/translate-course-content.mjs --all
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const sourceRoot = path.join(projectRoot, 'Course');
const outputRoot = path.join(sourceRoot, 'locales');
const supportedLocales = ['zh-TW', 'en', 'fr', 'es'];
const requestedLocale = process.argv.includes('--all')
  ? undefined
  : process.argv[process.argv.indexOf('--locale') + 1];

if (requestedLocale && !supportedLocales.includes(requestedLocale)) {
  throw new Error(`Unsupported locale: ${requestedLocale}. Use one of ${supportedLocales.join(', ')}.`);
}

const locales = requestedLocale ? [requestedLocale] : supportedLocales;
const overwrite = process.argv.includes('--overwrite');
const onlyCourse = process.argv.includes('--course')
  ? process.argv[process.argv.indexOf('--course') + 1]
  : undefined;

const languageNames = {
  'zh-TW': 'Traditional Chinese as used in Taiwan',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
};

// This is deliberately a Taiwan-oriented glossary, rather than a character
// converter. Add newly reviewed terms here before regenerating zh-TW content.
const traditionalTaiwanGlossary = [
  ['軟件', '軟體'],
  ['人工智能', '人工智慧'],
  ['打印機', '列印機'],
  ['打印', '列印'],
  ['打印出來', '列印出來'],
  ['鼠標', '滑鼠'],
  ['文件夾', '資料夾'],
  ['文件', '檔案'],
  ['視頻', '影片'],
  ['數據庫', '資料庫'],
  ['數據', '資料'],
  ['默認', '預設'],
  ['配置', '設定'],
  ['程序', '程式'],
  ['代碼', '程式碼'],
  ['源碼', '原始碼'],
  ['開發者', '開發人員'],
  ['用戶', '使用者'],
  ['賬號', '帳號'],
  ['登錄', '登入'],
  ['網絡', '網路'],
  ['服務器', '伺服器'],
  ['信息', '資訊'],
  ['優化', '最佳化'],
  ['插件', '外掛'],
  ['模塊', '模組'],
  ['內存', '記憶體'],
  ['硬盤', '硬碟'],
  ['兼容', '相容'],
  ['質量', '品質'],
  ['智能體', '代理程式'],
];

const protectedTerms = [
  'AGENTS.md', 'CLAUDE.md', 'SOUL.md', 'Claude Code', 'OpenAI Codex', 'Codex',
  'Hermes Agent', 'Hermes', 'OpenClaw', 'Cloudflare', 'Google OAuth', 'GitHub',
  'MCP', 'CLI', 'TUI', 'IDE', 'API', 'SDK', 'VPS', 'RAG', 'D1', 'R2', 'OAuth',
  'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Markdown', 'JSON', 'YAML',
  'VS Code', 'VSCode', 'npm', 'npx', 'pnpm', 'git', 'Git', 'CI', 'PR', 'CSV',
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'locales' || entry.name === 'pics') continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(absolutePath);
    }
  }

  return files;
}

function protectMarkdown(input) {
  const values = [];
  const protect = (value) => {
    const key = `ZZPROTECTEDTOKEN${values.length}ZZ`;
    values.push(value);
    return key;
  };

  let text = input;
  text = text.replace(/```[\s\S]*?```/g, protect);
  text = text.replace(/`[^`\n]+`/g, protect);
  text = text.replace(/(!?\[)([^\]]*)(\]\()((?:[^()\\]|\\.)*)(\))/g, (_, open, label, targetStart, target, close) => (
    `${protect(open)}${label}${protect(`${targetStart}${target}${close}`)}`
  ));
  text = text.replace(/https?:\/\/[^\s)>]+/g, protect);
  text = text.replace(new RegExp(`\\b(?:${protectedTerms.map(escapeRegExp).join('|')})\\b`, 'g'), protect);

  return {
    text,
    restore: (translated) => translated.replace(/ZZPROTECTEDTOKEN(\d+)ZZ/g, (_, index) => values[Number(index)] ?? _),
  };
}

function splitForTranslation(input, maxLength = 1200) {
  const blocks = input.split(/(\n{2,})/);
  const chunks = [];
  let current = '';

  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };

  for (const block of blocks) {
    if (current.length + block.length <= maxLength) {
      current += block;
      continue;
    }

    flush();
    if (block.length <= maxLength) {
      current = block;
      continue;
    }

    const lines = block.split(/(?<=\n)/);
    for (const line of lines) {
      if (current.length + line.length > maxLength) flush();
      current += line;
    }
  }
  flush();
  return chunks;
}

async function translateChunk(text, locale, attempt = 0) {
  if (!text.trim()) return text;

  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'zh-CN',
    tl: locale,
    dt: 't',
    q: text,
  });

  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    const translated = body?.[0]?.map((entry) => entry?.[0] ?? '').join('');
    if (!translated) throw new Error('Empty translation result');
    return translated;
  } catch (error) {
    if (attempt >= 4) {
      throw new Error(`Translation failed for ${locale}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    return translateChunk(text, locale, attempt + 1);
  }
}

async function translateText(input, locale) {
  const protectedMarkdown = protectMarkdown(input);
  const chunks = splitForTranslation(protectedMarkdown.text);
  const translated = [];

  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, locale));
  }

  let output = protectedMarkdown.restore(translated.join(''));
  if (locale === 'zh-TW') {
    for (const [from, to] of traditionalTaiwanGlossary) {
      output = output.replaceAll(from, to);
    }
  }
  return output;
}

async function translateFrontmatter(raw, locale) {
  const match = raw.match(/^(---\n)([\s\S]*?)(\n---\n?)([\s\S]*)$/);
  if (!match) return translateText(raw, locale);

  const translatedLines = [];
  for (const line of match[2].split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1 || line.trimStart().startsWith('-')) {
      translatedLines.push(line);
      continue;
    }

    const key = line.slice(0, separator + 1);
    const value = line.slice(separator + 1).trim();
    if (!value || /^(\d+|\[[^\]]*\])$/.test(value) || /^(chapter|lesson|lab_id|slug):/.test(line)) {
      translatedLines.push(line);
      continue;
    }

    const quote = value.match(/^(['"])([\s\S]*)\1$/);
    const sourceValue = quote ? quote[2] : value;
    const translatedValue = await translateText(sourceValue, locale);
    translatedLines.push(`${key} ${quote ? `${quote[1]}${translatedValue}${quote[1]}` : translatedValue}`);
  }

  return `${match[1]}${translatedLines.join('\n')}${match[3]}${await translateText(match[4], locale)}`;
}

async function run() {
  const courseDirectories = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name !== 'locales' && entry.name !== 'pics')
    .map((entry) => entry.name)
    .filter((name) => !onlyCourse || name === onlyCourse);

  if (!courseDirectories.length) {
    throw new Error(`No source courses found${onlyCourse ? ` for ${onlyCourse}` : ''}.`);
  }

  for (const locale of locales) {
    for (const courseDirectory of courseDirectories) {
      const courseRoot = path.join(sourceRoot, courseDirectory);
      const files = await listMarkdownFiles(courseRoot);
      console.log(`[${locale}] ${courseDirectory}: ${files.length} Markdown files (${languageNames[locale]})`);

      for (const sourceFile of files) {
        const relativePath = path.relative(sourceRoot, sourceFile);
        const targetFile = path.join(outputRoot, locale, relativePath);
        try {
          if (!overwrite) {
            await readFile(targetFile, 'utf8');
            continue;
          }
        } catch {
          // A missing locale file is the normal first-run path.
        }

        const source = await readFile(sourceFile, 'utf8');
        const translated = await translateFrontmatter(source, locale);
        await mkdir(path.dirname(targetFile), { recursive: true });
        await writeFile(targetFile, translated, 'utf8');
        console.log(`  translated ${relativePath}`);
      }
    }
  }
}

await run();
