import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');
const courseContent = read('src/data/courseContent.ts');
const start = read('src/pages/CourseStart.tsx');
const detail = read('src/pages/CourseDetail.tsx');
const metadata = read('src/lib/routeMetadata.ts');

for (const globName of ['aiCourseOutlineModules', 'aiCourseChapterModules', 'aiCourseLessonModules']) {
  const startOffset = courseContent.indexOf(`const ${globName}`);
  const endOffset = courseContent.indexOf('\n\n', startOffset);
  assert.ok(startOffset >= 0 && endOffset > startOffset, `missing ${globName}`);
  assert.doesNotMatch(courseContent.slice(startOffset, endOffset), /eager:\s*true/, `${globName} must be lazy`);
}
for (const globName of ['coreSourceModules', 'coreLocalizedModules']) {
  const startOffset = courseContent.indexOf(`const ${globName}`);
  const endOffset = courseContent.indexOf('\n\n', startOffset);
  assert.ok(startOffset >= 0 && endOffset > startOffset, `missing ${globName}`);
  assert.doesNotMatch(courseContent.slice(startOffset, endOffset), /eager:\s*true/, `${globName} must be lazy`);
}
assert.match(courseContent, /export function loadCourse/, 'selected course loading API is missing');
assert.match(courseContent, /loadAiPracticeCourse/, 'Course\/15 must load only the selected practice course');
assert.match(courseContent, /loadCoreCourse/, 'core-course Markdown must load only on its route');
assert.match(courseContent, /Object\.keys\(chapterModules\)\.length !== 10/, 'incomplete localized course bodies must fail closed');
assert.match(start, /void loadCourse\(courseId \?\? '', locale\)/, 'course landing must await the selected course');
assert.match(detail, /void loadCourse\(courseId \?\? '', locale\)/, 'course detail must await the selected course');
assert.match(start, /<Navigate replace to=\{localizedPublicPath/, 'unavailable language course landings must redirect to the source locale');
assert.match(detail, /<Navigate replace to=\{localizedPublicPath/, 'unavailable language lesson routes must redirect to the source locale');
assert.match(metadata, /untranslatedCourseRoute/, 'untranslated course landing pages must be explicitly noindex');

console.log(JSON.stringify({
  course15Lazy: true,
  coreCoursesLazy: true,
  selectedCourseOnly: true,
  incompleteLocaleFailsClosed: true,
  sourceLocaleRedirect: true,
  seoNoindex: true,
}, null, 2));
