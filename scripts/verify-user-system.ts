import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { creatorReviewEmailTemplate, learningReminderEmailTemplate, passwordResetEmailTemplate, verificationEmailTemplate } from '../functions/_lib/email';

const migration = readFileSync(new URL('../migrations/0011_user_learning_creator_career.sql', import.meta.url), 'utf8');
const lessonProgressMigration = readFileSync(new URL('../migrations/0022_lesson_progress.sql', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const courseDetail = readFileSync(new URL('../src/pages/CourseDetail.tsx', import.meta.url), 'utf8');
const contentArea = readFileSync(new URL('../src/components/course/ContentArea.tsx', import.meta.url), 'utf8');
const myCourses = readFileSync(new URL('../src/pages/user/MyCourses.tsx', import.meta.url), 'utf8');
const progressApi = readFileSync(new URL('../functions/api/progress.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const creatorStudio = readFileSync(new URL('../src/pages/user/CreatorStudio.tsx', import.meta.url), 'utf8');
const routeBoundary = readFileSync(new URL('../src/components/layout/RouteErrorBoundary.tsx', import.meta.url), 'utf8');
const courseCatalog = readFileSync(new URL('../src/data/courseCatalog.ts', import.meta.url), 'utf8');
const verificationHandler = readFileSync(new URL('../functions/api/auth/verify.ts', import.meta.url), 'utf8');

for (const table of ['badges', 'user_badges', 'creator_courses', 'resume_profiles', 'resume_versions', 'resume_interview_questions', 'user_notifications']) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`), `missing ${table}`);
}
for (const column of ['avatar_key', 'preferred_locale', 'notification_email_enabled']) {
  assert.match(migration, new RegExp(`ADD COLUMN ${column}`), `missing users.${column}`);
}
for (const route of ["'/api/profile'", "'/api/account/overview'", "'/api/resumes'", "'/api/creator/courses'"]) {
  assert.ok(worker.includes(route), `missing Worker route ${route}`);
}
assert.ok(worker.includes('courses\\/([^/]+)\\/access'), 'missing public chapter-access route');
assert.match(courseDetail, /fetchCourseAccess\(course\.id\)/, 'course page must resolve server access rules');
assert.match(contentArea, /locked \?/, 'course content must render a locked branch');
assert.match(contentArea, /markdown\.split\('\\n'\)\.slice\(0, 32\)/, 'locked chapter must only render its preview');
assert.match(lessonProgressMigration, /CREATE TABLE IF NOT EXISTS lesson_progress/, 'lesson-level progress must be stored');
assert.match(lessonProgressMigration, /lesson_route_id/, 'lesson progress needs a stable lesson route identifier');
assert.match(progressApi, /body\.status === 'completed'/, 'lesson completion must be explicit');
assert.doesNotMatch(progressApi, /progressPercent >= 95/, 'scroll position must not auto-complete a lesson');
assert.match(courseDetail, /chapter_lesson_count: chapter\.lessons\.length/, 'course page must report the number of lessons in the chapter');
assert.match(contentArea, /onClick=\{onCompleteLesson\}/, 'Next and complete controls must persist lesson completion');
assert.match(myCourses, /copy\.graduated/, 'My Courses needs a graduated state');
assert.match(myCourses, /role="dialog"/, 'continuing a course must require a confirmation dialog');
assert.match(myCourses, /getCatalogCourseStartPath/, 'graduated courses must restart at the first lesson');
assert.match(myCourses, /studyainow-my-courses-view/, 'My Courses must remember the selected display mode');
assert.match(myCourses, /safeStorageGet/, 'My Courses must safely read browser storage');
assert.match(myCourses, /safeStorageSet/, 'My Courses must safely write browser storage');
assert.match(myCourses, /AbortController/, 'My Courses must abort a stale overview request when leaving the page');
assert.match(myCourses, /isValidDate/, 'My Courses must reject malformed progress timestamps');
assert.match(myCourses, /Array\.isArray\(course\.lesson_progress\)/, 'My Courses must validate progress arrays before rendering them');
assert.match(myCourses, /data-course-view="list"/, 'My Courses must support a list display');
assert.match(myCourses, /data-course-view="cards"/, 'My Courses must support a card display');
assert.match(myCourses, /courseListView/, 'list view must use localized UI copy');
assert.match(myCourses, /courseCardView/, 'card view must use localized UI copy');
assert.ok(app.includes('path="/me"'), 'missing protected member-space parent route');
for (const route of ['course', 'creator', 'creator/new', 'resume', 'job', 'referral', 'settings', 'notification']) {
  assert.ok(app.includes(`path="${route}"`), `missing protected member route /me/${route}`);
}
assert.doesNotMatch(app, /LearningHistory|path="history"/, 'Learning History must not remain a dashboard route');
assert.match(app, /lazy\(\(\) => import\('\.\/pages\/user\/MyCourses'/, 'member pages must be route-lazy-loaded');
assert.match(app, /lazy\(\(\) => import\('\.\/pages\/CourseDetail'/, 'course body must be route-lazy-loaded');
assert.match(app, /<RouteErrorBoundary/, 'the application must protect public routes with a global error boundary');
assert.match(routeBoundary, /data-testid="route-error-retry"/, 'error boundary must offer retry');
assert.match(routeBoundary, /data-testid="route-error-return-courses"/, 'error boundary must offer a return-to-courses action');
assert.doesNotMatch(courseCatalog, /import\.meta\.glob\([^\n]*lessons\//, 'catalogue metadata must not glob lesson markdown into its route chunk');
assert.match(creatorStudio, /to="\/me\/creator\/new"/, 'course creation must start from the course-list action');
assert.match(creatorStudio, /createMode/, 'course creation must have an isolated creation workflow');
assert.match(creatorStudio, /useEffect\(\(\) => \{ void load\(\); \}, \[load\]\)/, 'creator loading must not return a Promise from useEffect');
assert.match(verificationHandler, /status:\s*303/, 'email verification must use an explicit post-verification redirect');
assert.match(verificationHandler, /location:\s*url\.toString\(\)/, 'email verification must redirect to the constructed login URL');
assert.match(verificationHandler, /'cache-control':\s*'no-store, max-age=0'/, 'email verification redirects must not be cached');
assert.match(verificationHandler, /new URL\('\/login'/, 'email verification must not redirect to the catalogue root');
assert.match(verificationHandler, /row\.email_verified_at/, 'a previously verified account must be an idempotent verification success');
assert.match(verificationHandler, /env\.DB\.batch\(/, 'verification must claim a token and activate the account together');

const verification = verificationEmailTemplate({ username: 'Learner', verificationUrl: 'https://studyai.now/api/auth/verify?token=example' });
const reset = passwordResetEmailTemplate({ username: 'Learner', resetUrl: 'https://studyai.now/reset-password?token=example' });
const reminder = learningReminderEmailTemplate({ username: 'Learner', courseTitle: 'AI Engineering', continueUrl: 'https://studyai.now/courses/example' });
const creator = creatorReviewEmailTemplate({ username: 'Creator', courseTitle: 'Original Course', recommended: true, creatorUrl: 'https://studyai.now/me/creator' });
for (const email of [verification, reset, reminder, creator]) {
  assert.match(email.html, /Study AI Now!/, 'email needs branded HTML');
  assert.ok(email.text.length > 40, 'email needs a plain-text alternative');
}
assert.match(reminder.subject, /AI Engineering/);
assert.match(creator.subject, /Original Course/);

console.log('User-system verification passed.');
