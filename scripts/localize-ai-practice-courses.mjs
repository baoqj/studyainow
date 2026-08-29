#!/usr/bin/env node

/**
 * Build reviewed, locale-native Markdown for Course/15 through the Worker.
 * The API token authorizes only this build endpoint; LLM credentials remain
 * Worker secrets. Progress is resumable because existing validated files are
 * skipped unless --overwrite is passed.
 *
 * Example:
 * CURRICULUM_LOCALIZATION_TOKEN=... node scripts/localize-ai-practice-courses.mjs --locale en --batch-chapters 2
 */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const codeRoot = path.resolve(import.meta.dirname, '..');
const courseRoot = path.resolve(codeRoot, '../Course/15');
const localeRoot = path.resolve(codeRoot, '../Course/locales');
const endpoint = (process.env.CURRICULUM_LOCALIZATION_ENDPOINT || 'https://studyai.now/api/admin/curriculum/localize').replace(/\/$/, '');
const token = process.env.CURRICULUM_LOCALIZATION_TOKEN || '';
const locales = ['zh-TW', 'en', 'fr', 'es'];
const args = process.argv.slice(2);
const valueFor = (name, fallback) => args.includes(name) ? (args[args.indexOf(name) + 1] || fallback) : fallback;
const selectedLocale = valueFor('--locale', '');
const selectedCourse = valueFor('--course', '');
const batchChapters = Math.max(1, Math.min(1, Number(valueFor('--batch-chapters', '1')) || 1));
const overwrite = args.includes('--overwrite');
const dryRun = args.includes('--dry-run');

if (!locales.includes(selectedLocale)) throw new Error(`Use --locale ${locales.join('|')}.`);
if (!token && !dryRun) throw new Error('CURRICULUM_LOCALIZATION_TOKEN is required.');

const catalog = JSON.parse(await readFile(path.join(courseRoot, 'catalog.json'), 'utf8'));
const courses = catalog.filter((course) => !selectedCourse || course.id === selectedCourse || course.directory === selectedCourse);
if (!courses.length) throw new Error(`No Course/15 course matches ${selectedCourse}.`);

function rel(file) { return path.relative(courseRoot, file).split(path.sep).join('/'); }
function destination(relativePath) { return path.join(localeRoot, selectedLocale, '15', relativePath); }
function sameStructuralFrontmatter(source, localized) {
  const meta = (raw, name) => raw.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  return ['id', 'chapter', 'lesson', 'slug', 'course', 'interaction', 'skills', 'access']
    .every((key) => !meta(source, key) || meta(source, key) === meta(localized, key));
}

async function validExisting(relativePath, source) {
  if (overwrite) return false;
  try {
    const localized = await readFile(destination(relativePath), 'utf8');
    return localized.startsWith('---\n') && localized.length >= Math.max(800, Math.round(source.length * 0.55)) && sameStructuralFrontmatter(source, localized);
  } catch { return false; }
}

async function filesForCourse(course) {
  const root = path.join(courseRoot, course.directory);
  const groups = [];
  const outline = path.join(root, 'course-outline.md');
  groups.push([outline]);
  const chapters = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map((entry) => entry.name).sort();
  for (let offset = 0; offset < chapters.length; offset += batchChapters) {
    const files = [];
    for (const chapter of chapters.slice(offset, offset + batchChapters)) {
      const chapterRoot = path.join(root, chapter);
      files.push(path.join(chapterRoot, 'index.md'));
      const lessons = (await readdir(path.join(chapterRoot, 'lessons'))).filter((file) => file.endsWith('.md')).sort();
      files.push(...lessons.map((lesson) => path.join(chapterRoot, 'lessons', lesson)));
    }
    groups.push(files);
  }
  return groups;
}

async function localizeBatch(course, sourceFiles) {
  const rawFiles = await Promise.all(sourceFiles.map(async (file) => ({ path: rel(file), content: await readFile(file, 'utf8') })));
  const files = [];
  for (const file of rawFiles) if (!(await validExisting(file.path, file.content))) files.push(file);
  if (!files.length) return { skipped: true, files: [] };
  if (dryRun) return { skipped: false, dryRun: true, files: files.map((file) => file.path) };

  const response = await fetch(endpoint, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ locale: selectedLocale, files }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.files)) throw new Error(`${course.id}: ${payload.error || `HTTP ${response.status}`}`);
  const sourceByPath = new Map(files.map((file) => [file.path, file.content]));
  for (const output of payload.files) {
    if (!output || typeof output.path !== 'string' || typeof output.content !== 'string' || !sourceByPath.has(output.path)) throw new Error(`${course.id}: model returned an invalid output path`);
    if (!sameStructuralFrontmatter(sourceByPath.get(output.path), output.content)) throw new Error(`${course.id}: model changed stable curriculum metadata in ${output.path}`);
    const target = destination(output.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, output.content.endsWith('\n') ? output.content : `${output.content}\n`, 'utf8');
  }
  return { skipped: false, provider: payload.provider, model: payload.model, files: payload.files.map((file) => file.path) };
}

let written = 0;
let skipped = 0;
for (const course of courses) {
  const groups = await filesForCourse(course);
  for (let index = 0; index < groups.length; index += 1) {
    const result = await localizeBatch(course, groups[index]);
    if (result.skipped) skipped += groups[index].length;
    else written += result.files.length;
    console.log(JSON.stringify({ locale: selectedLocale, course: course.id, batch: `${index + 1}/${groups.length}`, ...result }));
  }
}
console.log(JSON.stringify({ locale: selectedLocale, courses: courses.length, written, skipped, dryRun }, null, 2));
