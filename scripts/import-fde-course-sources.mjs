import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const codeRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(codeRoot, '../Course/ForwardDeployedEngineer');
const courseSlug = 'forward-deployed-engineering';
const dryRun = process.argv.includes('--dry-run');
const skipR2 = process.argv.includes('--skip-r2');
const localeDirectories = [
  ['en', 'AI_FDE_Course'], ['zh-CN', 'AI_FDE_Course_CN'], ['zh-TW', 'AI_FDE_Course_ZH_TW'], ['fr', 'AI_FDE_Course_FR'], ['es', 'AI_FDE_Course_ES'],
];

function hash(value) { return createHash('sha256').update(value).digest('base64url'); }
function q(value) { return `'${String(value).replaceAll("'", "''")}'`; }

async function command(name, args, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(name, args, { cwd: codeRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = ''; let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolvePromise(stdout) : reject(new Error(`${name} failed (${code}): ${stderr.slice(-1800)}`)));
    child.stdin.end(input);
  });
}

async function parallel(items, concurrency, fn) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) { const item = items[cursor++]; await fn(item); }
  }));
}

function summary(body) {
  return body.split('\n').map((line) => line.trim()).find((line) => line && !/^(#|!\[|>|\||[-*]\s|\d+\.)/.test(line))?.replace(/[*_`]/g, '').slice(0, 260) ?? '';
}

async function canonicalUnits() {
  const directory = resolve(root, 'AI_FDE_Course');
  const files = (await readdir(directory)).filter((file) => /^\d{2}-.*\.md$/.test(file)).sort();
  const units = [];
  for (const file of files) {
    const raw = await readFile(resolve(directory, file), 'utf8');
    const chapter = Number(file.slice(0, 2));
    const matches = [...raw.matchAll(/^##\s+(\d+)\.(\d+)\s+(.+)$/gm)];
    const chapterContent = raw.slice(0, matches[0]?.index ?? raw.length).trim();
    units.push({
      id: `course-source:${courseSlug}:${chapter}:chapter`, chapter, lessonRouteId: '', title: raw.match(/^#\s+(.+)$/m)?.[1] ?? `FDE Chapter ${chapter}`,
      content: chapterContent, markdownPath: `knowledge-sources/${courseSlug}/en/${chapter}/chapter.md`,
    });
    for (const [index, match] of matches.entries()) {
      const lesson = Number(match[2]); const route = `${String(chapter).padStart(2, '0')}-${String(lesson).padStart(2, '0')}`;
      const start = (match.index ?? 0) + match[0].length; const end = matches[index + 1]?.index ?? raw.length;
      const content = `# ${match[3].trim()}\n\n${raw.slice(start, end).trim()}\n`;
      units.push({ id: `course-source:${courseSlug}:${chapter}:${route}`, chapter, lessonRouteId: route, title: match[3].trim(), content, markdownPath: `knowledge-sources/${courseSlug}/en/${chapter}/${route}.md` });
    }
  }
  return units.map((unit) => ({ ...unit, sourceHash: hash(unit.content), summary: summary(unit.content) }));
}

async function localizedArchiveFiles() {
  const output = [];
  for (const [locale, directoryName] of localeDirectories) {
    const directory = resolve(root, directoryName);
    const names = (await readdir(directory)).filter((file) => file.endsWith('.md') || file.endsWith('.json')).sort();
    for (const name of names) output.push({ locale, sourcePath: resolve(directory, name), r2Path: `course-locales/${courseSlug}/${locale}/${name}` });
  }
  return output;
}

const units = await canonicalUnits();
const archives = await localizedArchiveFiles();
console.log(JSON.stringify({ dryRun, skipR2, canonicalUnits: units.length, chapters: units.filter((unit) => !unit.lessonRouteId).length, lessons: units.filter((unit) => unit.lessonRouteId).length, localizedArchives: archives.length }));
if (dryRun) process.exit(0);

const temp = await mkdtemp(resolve(tmpdir(), 'studyainow-fde-import-'));
try {
  if (!skipR2) {
    const uploadUnits = [];
    for (const unit of units) {
      const path = resolve(temp, `${unit.chapter}-${unit.lessonRouteId || 'chapter'}.md`);
      await writeFile(path, unit.content, 'utf8');
      uploadUnits.push({ sourcePath: path, r2Path: unit.markdownPath, locale: 'en' });
    }
    await parallel([...uploadUnits, ...archives], 10, async (item) => {
      if (!existsSync(item.sourcePath)) throw new Error(`Missing source ${item.sourcePath}`);
      await command('npx', ['wrangler', 'r2', 'object', 'put', `studyainow-storage/${item.r2Path}`, '--remote', '--file', item.sourcePath, '--content-type', item.sourcePath.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8', '--content-language', item.locale]);
    });
  }

  const statements = [];
  for (const unit of units) {
    statements.push(`INSERT INTO course_knowledge_sources (id, course_slug, chapter_route_id, lesson_route_id, title, language, markdown_path, source_hash) VALUES (${q(unit.id)}, ${q(courseSlug)}, ${q(String(unit.chapter))}, ${q(unit.lessonRouteId)}, ${q(unit.title)}, 'en', ${q(unit.markdownPath)}, ${q(unit.sourceHash)}) ON CONFLICT(course_slug, chapter_route_id, lesson_route_id) DO UPDATE SET id=excluded.id, title=excluded.title, language='en', markdown_path=excluded.markdown_path, source_hash=excluded.source_hash, updated_at=CURRENT_TIMESTAMP;`);
    statements.push(`INSERT OR IGNORE INTO knowledge_refresh_queue (id, source_type, source_id, source_hash, source_locator_json, status) VALUES (${q(`kg-course-${hash(`${unit.id}:${unit.sourceHash}`).slice(0, 28)}`)}, 'course_chapter', ${q(unit.id)}, ${q(unit.sourceHash)}, ${q(JSON.stringify({ courseId: courseSlug, chapterRouteId: String(unit.chapter), lessonRouteId: unit.lessonRouteId || null }))}, 'pending');`);
  }
  const sqlPath = resolve(temp, 'fde-course-sources.sql');
  await writeFile(sqlPath, `${statements.join('\n')}\n`, 'utf8');
  await command('npx', ['wrangler', 'd1', 'execute', 'studyainow-db', '--remote', '--file', sqlPath]);
  console.log(JSON.stringify({ imported: units.length, archived: skipR2 ? 0 : archives.length, canonicalUploaded: skipR2 ? 0 : units.length }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
