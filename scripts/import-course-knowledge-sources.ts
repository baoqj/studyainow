import { createHash } from 'node:crypto';
import { readdir, readFile, rm, writeFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

type CourseSpec = { id: string; slug: string; title: string; subtitle: string; description: string; topic: string; directory: string; level: string };
type AiCourseCatalogEntry = { id: string; directory: string; title: string; subtitle: string; description: string; category: string; difficulty: string };
type Material = {
  id: string; courseSlug: string; chapterId: string; chapterNumber: number; chapterSlug: string; chapterTitle: string; summary: string;
  durationMinutes: number; lessonRouteId: string; title: string; filePath: string; markdownPath: string; sourceHash: string; content: string;
};

const codeRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const courseRoot = resolve(codeRoot, '../Course');
const dryRun = process.argv.includes('--dry-run');
const skipR2 = process.argv.includes('--skip-r2');
const startAt = process.argv.find((argument) => argument.startsWith('--start-at='))?.slice('--start-at='.length) ?? '';
const uploadConcurrency = 12;
const aiCourseCatalog = JSON.parse(await readFile(resolve(courseRoot, '15/catalog.json'), 'utf8')) as AiCourseCatalogEntry[];
const allCourseSpecs: CourseSpec[] = [
  { id: 'course_claude_code_guide', slug: 'claude-code-guide', title: 'Claude Code 实战指南', subtitle: '把 AI 变成你的工程搭档', description: '从安装、仓库理解到 MCP、权限、安全和工程交付的 Claude Code 实战课程。', topic: 'Claude Code', directory: 'claude-code-guide', level: 'beginner' },
  { id: 'course_hermes_agent_guide', slug: 'hermes-agent-guide', title: 'Hermes Agent 入门实战指南', subtitle: '理论知识讲解与实战技能应用', description: '涵盖 Provider、Tools、Memory、Skills、MCP、Gateway、Cron、部署与多 Agent 协作的 Hermes Agent 课程。', topic: 'Hermes Agent', directory: 'hermes-agent-guide', level: 'beginner' },
  { id: 'course_codex_tutorial', slug: 'codex-tutorial', title: 'OpenAI Codex 实战教程', subtitle: '从本地编码到 AI 原生工程团队', description: '覆盖 Codex CLI、IDE、App、Cloud Tasks、AGENTS.md、权限安全、MCP、Skills 和 Automations 的实战课程。', topic: 'OpenAI Codex', directory: 'Codex', level: 'beginner' },
  ...aiCourseCatalog.map((course) => ({
    id: `course_${course.id.replaceAll('-', '_')}`,
    slug: course.id,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    topic: course.category,
    directory: `15/${course.directory}`,
    level: course.difficulty.toLocaleLowerCase(),
  })),
];
const courseSpecs = process.argv.includes('--only-ai')
  ? allCourseSpecs.filter((course) => course.directory.startsWith('15/'))
  : allCourseSpecs;

function sql(value: string | number | null) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('base64url');
}

function frontmatter(raw: string) {
  if (!raw.startsWith('---')) return {} as Record<string, string>;
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return {} as Record<string, string>;
  return Object.fromEntries(raw.slice(3, end).split('\n').flatMap((line) => {
    const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!match) return [];
    return [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]];
  }));
}

function routeId(fileName: string, fallback: string) {
  return fileName.match(/^(\d{1,2}-\d{1,2})/)?.[1].split('-').map((part) => part.padStart(2, '0')).join('-') ?? fallback;
}

function chapterSlug(path: string) {
  return basename(dirname(path)).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 96) || 'chapter';
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.isFile() && entry.name === 'index.md' ? [path] : [];
  }));
  return nested.flat();
}

async function command(commandName: string, args: string[], input?: string) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(commandName, args, { cwd: codeRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    // Wrangler can emit a line per uploaded object / SQL statement; drain
    // stdout so a large import cannot block on the child-process pipe buffer.
    child.stdout.resume();
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolvePromise() : reject(new Error(`${commandName} ${args.slice(0, 4).join(' ')} failed (${code}): ${stderr.slice(-1_500)}`)));
    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
  });
}

async function eachParallel<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await fn(item);
    }
  }));
}

async function collectCourse(spec: CourseSpec) {
  const root = resolve(courseRoot, spec.directory);
  if (!existsSync(root)) throw new Error(`Course directory is missing: ${root}`);
  const indexes = (await walk(root)).sort();
  const materials: Material[] = [];
  for (const indexPath of indexes) {
    const indexRaw = await readFile(indexPath, 'utf8');
    const meta = frontmatter(indexRaw);
    const chapterNumber = Number(meta.chapter);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 0) continue;
    const chapterRouteId = String(chapterNumber);
    const chapterId = `course-source:${spec.slug}:${chapterRouteId}:chapter`;
    const chapterTitle = meta.title || `Chapter ${chapterRouteId}`;
    const chapterSourceKey = `knowledge-sources/${spec.slug}/${chapterRouteId}/chapter.md`;
    materials.push({
      id: chapterId, courseSlug: spec.slug, chapterId, chapterNumber, chapterSlug: chapterSlug(indexPath), chapterTitle,
      summary: meta.summary || '', durationMinutes: Number.parseInt(meta.duration || '', 10) || 45, lessonRouteId: '', title: chapterTitle,
      filePath: indexPath, markdownPath: chapterSourceKey, sourceHash: hash(indexRaw), content: indexRaw,
    });
    const lessonDirectory = resolve(dirname(indexPath), 'lessons');
    if (!existsSync(lessonDirectory)) continue;
    const lessonFiles = (await readdir(lessonDirectory)).filter((file) => file.endsWith('.md')).sort();
    for (const file of lessonFiles) {
      const path = resolve(lessonDirectory, file);
      const raw = await readFile(path, 'utf8');
      const lessonMeta = frontmatter(raw);
      const lessonId = routeId(file, relative(root, path).replace(/[^a-zA-Z0-9]+/g, '-'));
      const lessonTitle = lessonMeta.title || basename(file, '.md');
      materials.push({
        id: `course-source:${spec.slug}:${chapterRouteId}:${lessonId}`, courseSlug: spec.slug, chapterId, chapterNumber,
        chapterSlug: chapterSlug(indexPath), chapterTitle, summary: meta.summary || '', durationMinutes: Number.parseInt(meta.duration || '', 10) || 45,
        lessonRouteId: lessonId, title: lessonTitle, filePath: path, markdownPath: `knowledge-sources/${spec.slug}/${chapterRouteId}/${lessonId}.md`, sourceHash: hash(raw), content: raw,
      });
    }
  }
  return materials;
}

async function main() {
  const grouped = await Promise.all(courseSpecs.map(async (spec) => ({ spec, materials: await collectCourse(spec) })));
  const materials = grouped.flatMap((item) => item.materials);
  const chapters = materials.filter((item) => !item.lessonRouteId);
  const startIndex = startAt ? grouped.findIndex(({ spec }) => spec.slug === startAt) : 0;
  if (startAt && startIndex < 0) throw new Error(`Unknown --start-at course: ${startAt}`);
  const uploadMaterials = grouped.slice(Math.max(0, startIndex)).flatMap((item) => item.materials);
  console.log(JSON.stringify({ dryRun, skipR2, startAt: startAt || null, courses: grouped.map(({ spec, materials: entries }) => ({ course: spec.slug, units: entries.length, chapters: entries.filter((item) => !item.lessonRouteId).length })), totalUnits: materials.length, uploadUnits: skipR2 ? 0 : uploadMaterials.length }));
  if (dryRun) return;

  if (!skipR2) {
    await eachParallel(uploadMaterials, uploadConcurrency, async (material) => {
      await command('npx', ['wrangler', 'r2', 'object', 'put', `studyainow-storage/${material.markdownPath}`, '--remote', '--file', material.filePath, '--content-type', 'text/markdown; charset=utf-8', '--content-language', 'zh-CN']);
    });
  }

  const courseStatements = courseSpecs.map((spec) =>
    `INSERT INTO courses (id, slug, title, subtitle, description, topic, level, status, visibility, price_points, markdown_root, published_at) VALUES (${sql(spec.id)}, ${sql(spec.slug)}, ${sql(spec.title)}, ${sql(spec.subtitle)}, ${sql(spec.description)}, ${sql(spec.topic)}, ${sql(spec.level)}, 'published', 'public', 0, ${sql(`knowledge-sources/${spec.slug}`)}, CURRENT_TIMESTAMP) ON CONFLICT(slug) DO UPDATE SET title = excluded.title, subtitle = excluded.subtitle, description = excluded.description, topic = excluded.topic, level = excluded.level, status = 'published', visibility = 'public', markdown_root = excluded.markdown_root, updated_at = CURRENT_TIMESTAMP;`,
  );
  const chapterStatements = chapters.map((chapter, index) => {
    const spec = courseSpecs.find((item) => item.slug === chapter.courseSlug)!;
    const lessonPaths = materials.filter((item) => item.courseSlug === chapter.courseSlug && item.chapterNumber === chapter.chapterNumber && item.lessonRouteId).map((item) => item.markdownPath);
    return `INSERT INTO chapters (id, course_id, chapter_number, slug, title, summary, duration_minutes, markdown_path, lesson_details_path, is_free, order_index, published_at) VALUES (${sql(`chapter-${chapter.courseSlug}-${chapter.chapterNumber}`)}, ${sql(spec.id)}, ${chapter.chapterNumber}, ${sql(chapter.chapterSlug)}, ${sql(chapter.chapterTitle)}, ${sql(chapter.summary)}, ${chapter.durationMinutes}, ${sql(chapter.markdownPath)}, ${sql(JSON.stringify(lessonPaths))}, 1, ${index}, CURRENT_TIMESTAMP) ON CONFLICT(course_id, chapter_number) DO UPDATE SET slug = excluded.slug, title = excluded.title, summary = excluded.summary, duration_minutes = excluded.duration_minutes, markdown_path = excluded.markdown_path, lesson_details_path = excluded.lesson_details_path, is_free = excluded.is_free, order_index = excluded.order_index, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP;`;
  });
  const sourceStatements = materials.map((material) =>
    `INSERT INTO course_knowledge_sources (id, course_slug, chapter_route_id, lesson_route_id, title, language, markdown_path, source_hash) VALUES (${sql(material.id)}, ${sql(material.courseSlug)}, ${sql(String(material.chapterNumber))}, ${sql(material.lessonRouteId)}, ${sql(material.title)}, 'zh-CN', ${sql(material.markdownPath)}, ${sql(material.sourceHash)}) ON CONFLICT(course_slug, chapter_route_id, lesson_route_id) DO UPDATE SET id = excluded.id, title = excluded.title, language = excluded.language, markdown_path = excluded.markdown_path, source_hash = excluded.source_hash, updated_at = CURRENT_TIMESTAMP;`,
  );
  const queueStatements = materials.map((material) =>
    `INSERT OR IGNORE INTO knowledge_refresh_queue (id, source_type, source_id, source_hash, source_locator_json, status) VALUES (${sql(`kg-course-${hash(`${material.id}:${material.sourceHash}`).slice(0, 28)}`)}, 'course_chapter', ${sql(material.id)}, ${sql(material.sourceHash)}, ${sql(JSON.stringify({ courseId: material.courseSlug, chapterRouteId: String(material.chapterNumber), lessonRouteId: material.lessonRouteId || null }))}, 'pending');`,
  );
  const temp = await mkdtemp(resolve(tmpdir(), 'studyainow-course-graph-'));
  try {
    const sqlPath = resolve(temp, 'upsert-course-knowledge.sql');
    await writeFile(sqlPath, [...courseStatements, ...chapterStatements, ...sourceStatements, ...queueStatements].join('\n'), 'utf8');
    await command('npx', ['wrangler', 'd1', 'execute', 'studyainow-db', '--remote', '--file', sqlPath]);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ importedUnits: materials.length, importedChapters: chapters.length }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
