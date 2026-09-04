import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { proxyAdminNews } from '../functions/api/admin/news/proxy';

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
const interviewsApi = read('../functions/api/admin/interviews/index.ts');
const interviewsPage = read('../src/pages/admin/AdminInterviews.tsx');
const newsPage = read('../src/pages/admin/AdminNews.tsx');
const newsProxy = read('../functions/api/admin/news/proxy.ts');
const wrangler = read('../wrangler.toml');
const interviewAdminCatalog = read('../functions/_lib/interviewCatalog.ts');
const interviewContent = read('../src/data/interviewContent.ts');
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

for (const route of ['/api/admin/overview', '/api/admin/users', '/api/admin/interviews', '/api/admin/courses/system', '/api/admin/courses/community', '/api/admin/job-sources']) {
  assert.ok(worker.includes(`'${route}'`), `missing Worker route ${route}`);
}
assert.ok(worker.includes("'/api/activity/page-view'"), 'Worker must record authenticated page views');
assert.match(worker, /adminUserActivityMatch/, 'Worker must expose per-user activity tabs');
for (const route of ['users', 'courses', 'community-courses', 'interviews', 'knowledge-graph', 'job-sources', 'jobs', 'settings']) {
  assert.ok(app.includes(`path="${route}"`), `missing nested admin route ${route}`);
}
assert.ok(app.includes('path="news/*"'), 'News administration must own addressable child routes in the unified admin shell');
assert.match(app, /<AdminLayout \/>/, 'admin routes must share the SaaS shell');
assert.match(app, /path="users\/:userId"/, 'admin users need an addressable detail route');
assert.match(app, /<UserActivityTracker \/>/, 'authenticated navigation must be recorded');
assert.match(login, /role === 'admin' \|\| role === 'leader'/, 'password login must route administrators and effective Leaders to /admin');
assert.match(googleCallback, /adminRole \? '\/admin'/, 'Google login must route administrators to /admin');
assert.match(topbar, /to="\/me"/, 'administrator account menu must expose the member space');
assert.match(sidebar, /lg:hidden/, 'admin menu must use a mobile drawer');
assert.match(sidebar, /面试题集.+\/admin\/interviews/, 'admin menu must expose interview-set management');
assert.match(sidebar, /组织管理.+\/admin\/organizations/, 'administrator menu must expose organization management');
assert.match(sidebar, /组织用户.+my-organization\?tab=members/, 'Leader menu must expose organization members');
assert.match(sidebar, /新闻管理.+\/admin\/news/, 'administrator menu must expose Newsroom management');
assert.doesNotMatch(newsPage, /https:\/\/news\.studyai\.now/, 'unified News administration must never leave the main admin origin');
for (const capability of ['采集来源', '候选与 Claims', '文章与发布', '分类与标签', 'Claim Ledger']) {
  assert.ok(newsPage.includes(capability), `unified News administration must expose ${capability}`);
}
assert.match(worker, /pathname\.startsWith\('\/api\/admin\/news\/'\)/, 'main Worker must own every News admin API child route');
assert.match(newsProxy, /await requireAdmin\(env\.DB, request\)/, 'News proxy must derive access from the main administrator session');
assert.match(newsProxy, /x-studyai-admin-service-token/, 'News proxy must authenticate its private Service Binding request');
assert.match(newsProxy, /x-studyai-admin-actor/, 'News audit records must identify the main StudyAINow administrator');
assert.match(newsProxy, /x-news-csrf/, 'News mutations must enforce a same-origin CSRF signal');
assert.doesNotMatch(newsProxy, /headers:\s*request\.headers/, 'browser cookies and authorization headers must not be forwarded wholesale');
assert.match(wrangler, /binding = "NEWS_API"\s+service = "studyai-news-api"/, 'main Worker must bind privately to studyai-news-api');

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

assert.match(interviewsApi, /await requireAdmin/, 'only administrators may read interview analytics');
assert.match(interviewsApi, /category = 'interview'/, 'interview analytics must use tracked interview visits');
assert.match(interviewsApi, /COUNT\(DISTINCT user_id\)/, 'interview analytics must count unique visitors');
assert.match(interviewsApi, /JOIN users ON users\.id = events\.user_id/, 'visit history must include the owning user');
assert.match(interviewsPage, /<AdminInterviewTrend data=\{data\.trend\}/, 'the admin interview page must visualize traffic');
assert.match(interviewsPage, /用户访问历史/, 'the admin interview page must expose visit history');
assert.match(interviewsPage, /min-w-\[980px\]/, 'the interview list must use the available table width');
for (const id of ['ai-engineering-progressive-assessment', 'inference-engine-scheduler']) {
  assert.ok(interviewAdminCatalog.includes(id), `admin interview catalog must include ${id}`);
  assert.ok(interviewContent.includes(id), `public interview catalog must include ${id}`);
}

const adminUser = {
  id: '90f4ec4a-7f34-42c1-b6f2-5ce48e9c2586',
  email: 'admin@example.test',
  display_name: 'News Admin',
  username: 'news-admin',
  status: 'active',
  email_verified_at: '2026-09-03 00:00:00',
  avatar_url: null,
  organization_id: null,
  organization_role: null,
  organization_joined_at: null,
};
const adminDb = {
  prepare(sql: string) {
    const statement = {
      bind: (..._values: unknown[]) => statement,
      first: async () => sql.includes('FROM sessions') ? adminUser : null,
      all: async () => ({ results: sql.includes('user_roles.role') ? [{ role: 'admin' }] : [] }),
      run: async () => ({ success: true }),
    };
    return statement;
  },
} as unknown as D1Database;
let forwarded: Request | null = null;
const proxyEnv = {
  DB: adminDb,
  NEWS_ADMIN_SERVICE_TOKEN: 'test-news-service-token-with-at-least-32-characters',
  NEWS_API: {
    fetch: async (request: Request) => {
      forwarded = request;
      return Response.json({ ok: true, counts: {} }, { headers: { 'set-cookie': 'forbidden=1' } });
    },
  },
} as unknown as Env;
const getResponse = await proxyAdminNews({
  request: new Request('https://studyai.now/api/admin/news/dashboard', {
    headers: { cookie: 'studyainow_session=test-session', authorization: 'Bearer browser-secret' },
  }),
  env: proxyEnv,
});
assert.equal(getResponse.status, 200, 'an authenticated main administrator must reach the private News API');
assert.equal(forwarded?.headers.get('cookie'), null, 'main session cookies must not leave the main Worker');
assert.equal(forwarded?.headers.get('authorization'), null, 'browser authorization must not leave the main Worker');
assert.equal(forwarded?.headers.get('x-studyai-admin-actor'), `studyai-user:${adminUser.id}`, 'proxy must bind the authenticated actor');
assert.equal(getResponse.headers.get('set-cookie'), null, 'upstream cookies must not reach the browser');

forwarded = null;
const csrfResponse = await proxyAdminNews({
  request: new Request('https://studyai.now/api/admin/news/candidates/enrich', {
    method: 'POST',
    headers: { cookie: 'studyainow_session=test-session', origin: 'https://evil.example', 'x-news-csrf': '1' },
    body: '{}',
  }),
  env: proxyEnv,
});
assert.equal(csrfResponse.status, 403, 'cross-origin News mutations must be rejected');
assert.equal(forwarded, null, 'rejected mutations must not invoke the private Worker');

console.log('Admin control-panel verification passed.');
