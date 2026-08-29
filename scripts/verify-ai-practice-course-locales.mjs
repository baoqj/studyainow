#!/usr/bin/env node

/** Verifies Course/15 locale files without treating path slugs as prose. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const codeRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.resolve(codeRoot, '../Course/15');
const localeRoot = path.resolve(codeRoot, '../Course/locales');
const locales = ['zh-TW', 'en', 'fr', 'es'];
const args = process.argv.slice(2);
const getArg = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : '';
const requestedLocale = getArg('--locale');
const requestedCourse = getArg('--course');
const checkLocales = requestedLocale ? [requestedLocale] : locales;
if (requestedLocale && !locales.includes(requestedLocale)) throw new Error(`Unknown locale: ${requestedLocale}`);

const catalog = JSON.parse(await readFile(path.join(sourceRoot, 'catalog.json'), 'utf8'));
const courses = catalog.filter((course) => !requestedCourse || course.id === requestedCourse || course.directory === requestedCourse);
if (!courses.length) throw new Error(`No course matches ${requestedCourse}.`);
const failures = [];
const reports = [];

function frontmatter(raw) {
  return raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] || '';
}
function meta(raw, key) {
  return frontmatter(raw).match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
}
function renderedProse(raw) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\]\([^)]*\)/g, ']');
}
function fail(locale, file, reason) {
  failures.push(`${locale}: ${path.relative(localeRoot, file)} — ${reason}`);
}

for (const locale of checkLocales) {
  let chapterCount = 0;
  let lessonCount = 0;
  for (const course of courses) {
    const sourceCourse = path.join(sourceRoot, course.directory);
    const targetCourse = path.join(localeRoot, locale, '15', course.directory);
    const chapterNames = (await readdir(sourceCourse, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name)).map((entry) => entry.name).sort();
    const sourceFiles = [path.join(sourceCourse, 'course-outline.md')];
    for (const chapter of chapterNames) {
      sourceFiles.push(path.join(sourceCourse, chapter, 'index.md'));
      const lessons = (await readdir(path.join(sourceCourse, chapter, 'lessons'))).filter((file) => file.endsWith('.md')).sort();
      sourceFiles.push(...lessons.map((lesson) => path.join(sourceCourse, chapter, 'lessons', lesson)));
    }
    for (const sourceFile of sourceFiles) {
      const relative = path.relative(sourceRoot, sourceFile);
      const targetFile = path.join(localeRoot, locale, '15', relative);
      const source = await readFile(sourceFile, 'utf8');
      let localized = '';
      try { localized = await readFile(targetFile, 'utf8'); } catch { fail(locale, targetFile, 'missing localized Markdown'); continue; }
      if (!localized.startsWith('---\n')) fail(locale, targetFile, 'missing YAML frontmatter');
      if (localized.length < Math.max(800, Math.round(source.length * 0.55))) fail(locale, targetFile, 'content is materially shorter than the authored source');
      for (const key of ['id', 'chapter', 'lesson', 'slug', 'course', 'interaction', 'skills', 'access']) {
        if (meta(source, key) && meta(source, key) !== meta(localized, key)) fail(locale, targetFile, `stable ${key} changed`);
      }
      const prose = renderedProse(localized);
      if (['en', 'fr', 'es'].includes(locale) && /[\u3400-\u9fff]/u.test(prose)) fail(locale, targetFile, 'contains Han characters in learner-facing prose');
      if (locale === 'zh-TW' && /人工智能|软件|网络|数据库|用户|代码|源代码|打印机/u.test(prose)) fail(locale, targetFile, 'contains Simplified-Chinese technical vocabulary');
      if (/\/lessons\//.test(relative)) lessonCount += 1;
      if (/\/index\.md$/.test(relative)) chapterCount += 1;
    }
  }
  reports.push({ locale, courses: courses.length, chapters: chapterCount, lessons: lessonCount });
}

console.table(reports);
if (failures.length) {
  console.error(`\nCourse/15 localization verification failed (${failures.length} issues):`);
  for (const failure of failures.slice(0, 80)) console.error(`- ${failure}`);
  if (failures.length > 80) console.error(`- … ${failures.length - 80} more`);
  process.exitCode = 1;
} else {
  console.log(`\nCourse/15 localization verification passed for ${checkLocales.join(', ')}.`);
}
