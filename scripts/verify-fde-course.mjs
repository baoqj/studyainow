import { strict as assert } from 'node:assert';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const codeRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(codeRoot, '../Course/ForwardDeployedEngineer');
const coverRoot = resolve(codeRoot, '../img/cover/course');
// coverRef 是课程 README 中对统一封面目录的相对引用；coverFile 是封面文件名。
const courses = [
  ['en', 'AI_FDE_Course', '../../../img/cover/course/fde-cover-en.jpg', 'fde-cover-en.jpg', 'assets/field-loop-en.png'],
  ['zh-CN', 'AI_FDE_Course_CN', '../../../img/cover/course/fde-cover-zh-CN.jpg', 'fde-cover-zh-CN.jpg', 'assets/field-loop-zh-CN.png'],
  ['zh-TW', 'AI_FDE_Course_ZH_TW', '../../../img/cover/course/fde-cover-zh-TW.jpg', 'fde-cover-zh-TW.jpg', 'assets/field-loop-zh-TW.png'],
  ['fr', 'AI_FDE_Course_FR', '../../../img/cover/course/fde-cover-fr.jpg', 'fde-cover-fr.jpg', 'assets/field-loop-fr.png'],
  ['es', 'AI_FDE_Course_ES', '../../../img/cover/course/fde-cover-es.jpg', 'fde-cover-es.jpg', 'assets/field-loop-es.png'],
];
const requiredSkills = ['workflow-discovery', 'customer-facing-engineering', 'technical-scoping', 'solution-architecture', 'production-software-engineering', 'python-production-engineering', 'model-evaluation', 'private-hybrid-cloud', 'kubernetes-helm', 'devops-ci-cd', 'permission-aware-retrieval', 'agentic-workflows', 'human-in-the-loop', 'handoff-enablement', 'end-to-end-delivery'];

for (const [locale, directoryName, coverRef, coverFile, loop] of courses) {
  const directory = resolve(root, directoryName);
  const files = (await readdir(directory)).filter((file) => /^\d{2}-.*\.md$/.test(file)).sort();
  assert.equal(files.length, 12, `${locale}: expected 12 chapters`);
  let lessons = 0;
  for (const file of files) {
    const raw = await readFile(resolve(directory, file), 'utf8');
    const sections = [...raw.matchAll(/^##\s+(\d+)\.(\d+)\s+(.+)$/gm)];
    assert.ok(sections.length >= 5, `${locale}/${file}: expected at least five lessons`);
    lessons += sections.length;
    for (const [index, section] of sections.entries()) {
      const start = (section.index ?? 0) + section[0].length;
      const end = sections[index + 1]?.index ?? raw.length;
      const body = raw.slice(start, end);
      assert.ok(/^###\s+/m.test(body), `${locale}/${file}/${section[2]}: missing structured subsections`);
      assert.ok(/exercise|practice|question|练习|实作|實作|思考|复盘|復盤|Exercice|Questions|Práctica|Preguntas/i.test(body), `${locale}/${file}/${section[2]}: missing exercise or questions`);
    }
  }
  assert.equal(lessons, 61, `${locale}: expected 61 lessons`);
  const readme = await readFile(resolve(directory, 'README.md'), 'utf8');
  assert.match(readme, /Forward Deployed|前线交付|前線部署|Ingénierie IA|Ingeniería de IA/, `${locale}: localized course title missing`);
  assert.ok(readme.includes(coverRef), `${locale}: README does not reference the unified cover path`);
  const firstChapter = await readFile(resolve(directory, files[0]), 'utf8');
  assert.ok(firstChapter.includes(loop), `${locale}: first chapter does not use localized field-loop visual`);
  assert.ok((await stat(resolve(coverRoot, coverFile))).size > 100_000, `${locale}: cover asset looks incomplete`);
  assert.ok((await stat(resolve(directory, loop))).size > 500_000, `${locale}: field-loop asset looks incomplete`);
  const manifest = JSON.parse(await readFile(resolve(directory, 'course-manifest.json'), 'utf8'));
  assert.equal(manifest.id, 'forward-deployed-engineering');
  assert.equal(manifest.locale, locale);
  assert.equal(manifest.lessons, 61);
  assert.equal(manifest.chapters.length, 12);
  assert.match(manifest.title, /FDE/, `${locale}: title must contain FDE`);
  assert.equal(manifest.category, locale === 'zh-CN' ? 'FDE工程师' : locale === 'zh-TW' ? 'FDE 工程師' : 'Forward Deployed Engineer (FDE)');
  for (const skill of requiredSkills) assert.ok(manifest.skills.includes(skill), `${locale}: manifest missing ${skill}`);
  const knowledge = await readFile(resolve(directory, 'knowledge-points.md'), 'utf8');
  for (const skill of requiredSkills) assert.ok(knowledge.includes(`\`${skill}\``), `${locale}: knowledge matrix missing ${skill}`);
}

const catalog = await readFile(resolve(codeRoot, 'src/data/courseCatalog.ts'), 'utf8');
const content = await readFile(resolve(codeRoot, 'src/data/courseContent.ts'), 'utf8');
const courseware = await readFile(resolve(codeRoot, 'src/components/course/FdeInteractiveCourseware.tsx'), 'utf8');
const renderer = await readFile(resolve(codeRoot, 'src/components/course/MarkdownRenderer.tsx'), 'utf8');
const migration = await readFile(resolve(codeRoot, 'migrations/0032_forward_deployed_engineering.sql'), 'utf8');
assert.match(catalog, /forward-deployed-engineering/, 'catalog is missing FDE');
assert.match(content, /buildFdeCourse/, 'course loader is missing FDE parser');
for (const interaction of ['CLICK', 'SLIDE', 'DRAG', 'COMPARE']) assert.ok(courseware.includes(interaction), `interactive courseware missing ${interaction}`);
assert.match(renderer, /type: 'image'/, 'Markdown renderer must render course images');
for (const skill of requiredSkills) assert.ok(migration.includes(skill), `graph migration missing ${skill}`);
assert.match(migration, /lesson_skill_coverage/, 'graph migration is missing lesson coverage');
assert.match(migration, /job_skill_evidence/, 'graph migration is missing exact JD evidence');

console.log('FDE course verification passed: 5 locales, 60 chapters, 305 lessons, localized media, interactions, and JD skill mappings.');
