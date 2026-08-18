import { strict as assert } from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const codeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(codeRoot, '../Course/15');
const catalog = JSON.parse(await readFile(resolve(root, 'catalog.json'), 'utf8'));
const graph = JSON.parse(await readFile(resolve(root, 'knowledge-graph.json'), 'utf8'));

assert.equal(catalog.length, 15, 'Expected exactly 15 AI practice courses');
assert.equal(graph.courses.length, 15, 'Knowledge graph must include all 15 courses');
assert.ok(graph.skills.length >= 50, 'Knowledge graph needs a useful canonical skill vocabulary');

let chapterCount = 0;
let lessonCount = 0;
const interactionCounts = new Map();

for (const course of catalog) {
  const courseRoot = resolve(root, course.directory);
  const outline = await readFile(resolve(courseRoot, 'course-outline.md'), 'utf8');
  assert.match(outline, /## 教学目标/, `${course.id}: missing learning objectives`);
  assert.match(outline, /## 课程分类与筛选标签/, `${course.id}: missing filter classification`);
  assert.match(outline, /## Skill 知识点/, `${course.id}: missing skill taxonomy`);
  await readFile(resolve(courseRoot, 'assets/cover.svg'), 'utf8');
  await readFile(resolve(courseRoot, 'assets/learning-map.svg'), 'utf8');
  await readFile(resolve(courseRoot, 'source-mainline.md'), 'utf8');
  const manifest = JSON.parse(await readFile(resolve(courseRoot, 'courseware/interaction-manifest.json'), 'utf8'));
  assert.equal(manifest.interactions.length, 30, `${course.id}: expected 30 interactive lessons`);

  const directories = (await readdir(courseRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  assert.equal(directories.length, 10, `${course.id}: expected 10 chapters`);
  chapterCount += directories.length;

  for (const chapterDirectory of directories) {
    const chapterRoot = resolve(courseRoot, chapterDirectory);
    const chapter = await readFile(resolve(chapterRoot, 'index.md'), 'utf8');
    assert.match(chapter, /## 本章知识结构/, `${course.id}/${chapterDirectory}: missing knowledge structure`);
    assert.match(chapter, /## 本章验收/, `${course.id}/${chapterDirectory}: missing acceptance criteria`);
    const lessonFiles = (await readdir(resolve(chapterRoot, 'lessons'))).filter((file) => file.endsWith('.md')).sort();
    assert.equal(lessonFiles.length, 3, `${course.id}/${chapterDirectory}: expected 3 lessons`);
    lessonCount += lessonFiles.length;
    for (const lessonFile of lessonFiles) {
      const lesson = await readFile(resolve(chapterRoot, 'lessons', lessonFile), 'utf8');
      assert.ok(lesson.length >= 1_200, `${course.id}/${lessonFile}: lesson is too short`);
      assert.match(lesson, /interaction: (choice|slider|sort|sequence|compare)/, `${course.id}/${lessonFile}: missing interaction`);
      assert.match(lesson, /skills: \[/, `${course.id}/${lessonFile}: missing skill coverage`);
      assert.match(lesson, /## 互动课件/, `${course.id}/${lessonFile}: missing courseware instructions`);
      assert.match(lesson, /## (随堂练习|实操题|提交练习)/, `${course.id}/${lessonFile}: missing hands-on exercise`);
      const interaction = lesson.match(/interaction: (\w+)/)?.[1] ?? 'missing';
      interactionCounts.set(interaction, (interactionCounts.get(interaction) ?? 0) + 1);
    }
  }
}

assert.equal(chapterCount, 150, 'Expected 150 chapters');
assert.equal(lessonCount, 450, 'Expected 450 lessons');
for (const interaction of ['choice', 'slider', 'sort', 'sequence', 'compare']) {
  assert.ok((interactionCounts.get(interaction) ?? 0) >= 80, `Interaction ${interaction} is underrepresented`);
}

const migration = await readFile(resolve(codeRoot, 'migrations/0021_ai_practice_courses.sql'), 'utf8');
assert.match(migration, /curriculum_curated/, 'Migration must contain reviewed skill relations');
assert.equal((migration.match(/INSERT INTO lesson_skill_coverage/g) ?? []).length, 900, 'Expected two reviewed skill mappings per lesson');

const courseContent = await readFile(resolve(codeRoot, 'src/data/courseContent.ts'), 'utf8');
const courseware = await readFile(resolve(codeRoot, 'src/components/course/InteractiveCourseware.tsx'), 'utf8');
assert.match(courseContent, /Course\/15\/\*\/course-outline\.md/, 'Frontend must load the 15-course catalog');
for (const interaction of ['ChoiceLab', 'SliderLab', 'SortLab', 'SequenceLab', 'CompareLab']) {
  assert.match(courseware, new RegExp(`function ${interaction}`), `Missing interactive component ${interaction}`);
}

console.log(JSON.stringify({ courses: catalog.length, chapters: chapterCount, lessons: lessonCount, skills: graph.skills.length, interactions: Object.fromEntries(interactionCounts) }, null, 2));
