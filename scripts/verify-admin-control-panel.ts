import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../migrations/0024_admin_control_panel.sql');
const activityMigration = read('../migrations/0038_user_activity_history.sql');
const organizationMigration = read('../migrations/0039_organizations_and_leaders.sql');
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
const userList = read('../src/pages/admin/AdminUsers.tsx');
const userDetail = read('../src/pages/admin/AdminUserDetail.tsx');
const activityTracker = read('../src/components/analytics/UserActivityTracker.tsx');
const pageViewApi = read('../functions/api/activity/page-view.ts');
const userActivityApi = read('../functions/api/admin/users/[userId]/activity.ts');
const organizationAccess = read('../functions/_lib/organizations.ts');
const organizationApi = read('../functions/api/admin/organizations/[organizationId].ts');
const organizationMembersApi = read('../functions/api/admin/organizations/[organizationId]/members.ts');
const organizationInvitesApi = read('../functions/api/admin/organizations/[organizationId]/invites.ts');
const organizationMessagesApi = read('../functions/api/admin/organizations/[organizationId]/messages.ts');
const registerApi = read('../functions/api/auth/register.ts');

assert.match(migration, /role IN \('user', 'member', 'operator', 'admin'\)/, 'migration must support all four managed identities');
for (const status of ['published', 'draft', 'expired', 'blocked']) assert.ok(migration.includes(`'${status}'`), `missing creator-course status ${status}`);
assert.match(migration, /CREATE TABLE IF NOT EXISTS course_engagement_events/, 'course click events need a D1 table');
assert.match(migration, /creator_name TEXT NOT NULL DEFAULT 'StudyAINow'/, 'first-party creator must default to StudyAINow');
assert.doesNotMatch(migration, /\bBEGIN\b|\bCOMMIT\b/, 'Wrangler owns D1 migration transaction boundaries');
assert.match(activityMigration, /CREATE TABLE IF NOT EXISTS user_activity_events/, 'user page history needs a D1 table');
assert.match(activityMigration, /FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE CASCADE/, 'activity must remain user-owned');
assert.match(activityMigration, /idx_user_activity_user_category_time/, 'filtered user-history tabs need a covering index');
assert.doesNotMatch(activityMigration, /\bBEGIN\b|\bCOMMIT\b/, 'Wrangler owns activity migration transaction boundaries');
for (const table of ['organizations', 'organization_invites', 'organization_invite_uses', 'organization_messages', 'organization_message_recipients', 'organization_audit_logs']) {
  assert.match(organizationMigration, new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?${table}\\b`), `organization migration must create ${table}`);
}
assert.match(organizationMigration, /role IN \('user', 'member', 'operator', 'leader', 'admin'\)/, 'managed identities must include Leader');

for (const route of ['/api/admin/overview', '/api/admin/users', '/api/admin/courses/system', '/api/admin/courses/community', '/api/admin/job-sources']) {
  assert.ok(worker.includes(`'${route}'`), `missing Worker route ${route}`);
}
assert.ok(worker.includes("'/api/activity/page-view'"), 'Worker must record authenticated page views');
assert.match(worker, /adminUserActivityMatch/, 'Worker must expose per-user activity tabs');
for (const route of ['users', 'courses', 'community-courses', 'knowledge-graph', 'job-sources', 'jobs', 'settings']) {
  assert.ok(app.includes(`path="${route}"`), `missing nested admin route ${route}`);
}
assert.match(app, /<AdminLayout \/>/, 'admin routes must share the SaaS shell');
assert.match(app, /path="users\/:userId"/, 'admin users need an addressable detail route');
assert.match(app, /<UserActivityTracker \/>/, 'authenticated navigation must be recorded');
assert.match(login, /role === 'admin' \|\| role === 'leader'/, 'password login must route administrators and effective Leaders to /admin');
assert.match(googleCallback, /adminRole \? '\/admin'/, 'Google login must route administrators to /admin');
assert.match(topbar, /to="\/me"/, 'administrator account menu must expose the member space');
assert.match(sidebar, /lg:hidden/, 'admin menu must use a mobile drawer');
assert.match(sidebar, /组织管理.+\/admin\/organizations/, 'administrator menu must expose organization management');
assert.match(sidebar, /组织用户.+my-organization\?tab=members/, 'Leader menu must expose organization members');

for (const route of ['/api/admin/organizations', '/api/admin/my-organization']) {
  assert.ok(worker.includes(`'${route}'`), `missing organization Worker route ${route}`);
}
assert.match(organizationAccess, /organizations\.status = 'active'/, 'Leader access must require an active organization');
assert.match(organizationAccess, /security\.scope_denied/, 'cross-organization access attempts must be audited');
for (const [source, label] of [[organizationApi, 'organization edits'], [organizationMembersApi, 'organization member edits'], [organizationInvitesApi, 'invitation edits'], [organizationMessagesApi, 'organization messages'], [registerApi, 'invited registration']] as const) {
  assert.match(source, /env\.DB\.batch\(/, `${label} must be atomically batched`);
}
assert.match(organizationApi, /expectedUpdatedAt/, 'organization edits must reject stale concurrent changes');
assert.match(organizationInvitesApi, /token_hash/, 'invitation storage must use hashed codes');
assert.match(organizationMessagesApi, /request_id/, 'message sends must be idempotent');
assert.match(registerApi, /organization_invite_uses/, 'registration must support organization invitation membership');

for (const [source, label] of [[usersApi, 'user edits'], [communityApi, 'creator-course status edits'], [sourcesApi, 'job-source edits']] as const) {
  assert.match(source, /env\.DB\.batch\(/, `${label} must be atomically batched`);
  assert.match(source, /admin_audit_logs/, `${label} must create an audit record`);
  assert.match(source, /expectedUpdatedAt/, `${label} must reject stale concurrent edits`);
}
assert.match(courseStart, /trackCourseClick\(course\.id\)/, 'course landing clicks must be recorded');
assert.match(courseDetail, /trackCourseClick\(course\.id, chapter\.chapter\)/, 'chapter clicks must be recorded');

assert.match(userList, /role="link"/, 'the complete user row must be keyboard clickable');
assert.match(userList, /\/admin\/users\/\$\{encodeURIComponent\(user\.id\)\}/, 'user rows must navigate to the detail page');
for (const label of ['用户信息', '操作历史', '课程学习', '查看职位', '面试题集', '简历']) {
  assert.ok(userDetail.includes(`label: '${label}'`), `missing user-detail tab ${label}`);
}
assert.match(userDetail, /useSearchParams/, 'user-detail tabs must remain directly addressable');
assert.match(userDetail, /progress_percent/, 'course tab must show learning progress');
assert.match(userDetail, /上传文件/, 'resume tab must show source uploads');
assert.match(userDetail, /创建的简历/, 'resume tab must show created resumes');
assert.match(activityTracker, /document\.querySelector<HTMLElement>\('main h1'\)/, 'activity title should use the visible page heading');
assert.match(activityTracker, /route: location\.pathname/, 'activity routes must exclude sensitive query strings');
assert.match(pageViewApi, /const user = await requireUser/, 'page views must derive ownership from the authenticated session');
assert.match(pageViewApi, /user\.id, category, pageTitle, route/, 'the authenticated user id must own the inserted page view');
assert.doesNotMatch(pageViewApi, /body\.userId/, 'clients must never choose activity ownership');
assert.match(userActivityApi, /await requireAdmin/, 'only administrators may read another user activity');
for (const source of ['user_activity_events', 'enrollments', 'reading_events', 'resume_source_documents', 'resume_documents']) {
  assert.ok(userActivityApi.includes(source), `user-detail API must query ${source}`);
}

console.log('Admin control-panel verification passed.');
