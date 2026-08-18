import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../migrations/0024_admin_control_panel.sql');
const worker = read('../src/worker.ts');
const app = read('../src/App.tsx');
const login = read('../src/pages/Login.tsx');
const googleCallback = read('../functions/api/auth/google/callback.ts');
const usersApi = read('../functions/api/admin/users/[userId].ts');
const communityApi = read('../functions/api/admin/courses/community/[courseId].ts');
const sourcesApi = read('../functions/api/admin/job-sources/[sourceId].ts');
const topbar = read('../src/components/admin/AdminTopbar.tsx');
const sidebar = read('../src/components/admin/AdminSidebar.tsx');
const courseStart = read('../src/pages/CourseStart.tsx');
const courseDetail = read('../src/pages/CourseDetail.tsx');

assert.match(migration, /role IN \('user', 'member', 'operator', 'admin'\)/, 'migration must support all four managed identities');
for (const status of ['published', 'draft', 'expired', 'blocked']) assert.ok(migration.includes(`'${status}'`), `missing creator-course status ${status}`);
assert.match(migration, /CREATE TABLE IF NOT EXISTS course_engagement_events/, 'course click events need a D1 table');
assert.match(migration, /creator_name TEXT NOT NULL DEFAULT 'StudyAINow'/, 'first-party creator must default to StudyAINow');
assert.doesNotMatch(migration, /\bBEGIN\b|\bCOMMIT\b/, 'Wrangler owns D1 migration transaction boundaries');

for (const route of ['/api/admin/overview', '/api/admin/users', '/api/admin/courses/system', '/api/admin/courses/community', '/api/admin/job-sources']) {
  assert.ok(worker.includes(`'${route}'`), `missing Worker route ${route}`);
}
for (const route of ['users', 'courses', 'community-courses', 'knowledge-graph', 'job-sources', 'jobs', 'settings']) {
  assert.ok(app.includes(`path="${route}"`), `missing nested admin route ${route}`);
}
assert.match(app, /<AdminLayout \/>/, 'admin routes must share the SaaS shell');
assert.match(login, /roles\.includes\('admin'\) \? '\/admin'/, 'password login must route administrators to /admin');
assert.match(googleCallback, /adminRole \? '\/admin'/, 'Google login must route administrators to /admin');
assert.match(topbar, /to="\/me"/, 'administrator account menu must expose the member space');
assert.match(sidebar, /lg:hidden/, 'admin menu must use a mobile drawer');

for (const [source, label] of [[usersApi, 'user edits'], [communityApi, 'creator-course status edits'], [sourcesApi, 'job-source edits']] as const) {
  assert.match(source, /env\.DB\.batch\(/, `${label} must be atomically batched`);
  assert.match(source, /admin_audit_logs/, `${label} must create an audit record`);
  assert.match(source, /expectedUpdatedAt/, `${label} must reject stale concurrent edits`);
}
assert.match(courseStart, /trackCourseClick\(course\.id\)/, 'course landing clicks must be recorded');
assert.match(courseDetail, /trackCourseClick\(course\.id, chapter\.chapter\)/, 'chapter clicks must be recorded');

console.log('Admin control-panel verification passed.');

