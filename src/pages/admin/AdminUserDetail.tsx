import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

type UserRow = {
  id: string; email: string; display_name: string; username: string | null; status: string; role: string; platform_role: string;
  points: number; timezone: string; bio: string; preferred_locale: string; email_verified_at: string | null;
  avatar_url: string | null; created_at: string; updated_at: string; last_login_at: string | null;
  organization_id: string | null; organization_name: string | null; organization_public_id: string | null; organization_role: string | null; organization_joined_at: string | null;
};
type ActivitySummary = { history: number; jobs: number; interviews: number; courses: number; uploads: number; resumes: number };
type UserDetail = {
  user: UserRow;
  pointTransactions: Array<{ id: string; amount: number; reason: string; reference_type: string | null; created_at: string }>;
  activitySummary: ActivitySummary;
};
type ActivityItem = { id: string; event_type: string; category: string; page_title: string; route: string; entity_id: string | null; occurred_at: string };
type PagedActivity = { tab: string; items: ActivityItem[]; total: number; page: number; limit: number };
type CourseActivity = {
  tab: 'courses';
  courses: Array<{
    id: string; slug: string; title: string; enrollment_status: string; started_at: string | null; completed_at: string | null;
    chapter_count: number; completed_chapters: number; progress_percent: number; last_read_at: string | null;
  }>;
  records: Array<{
    id: string; event_type: string; progress_percent: number; created_at: string; course_slug: string; course_title: string;
    chapter_number: number; chapter_slug: string; chapter_title: string;
  }>;
};
type ResumeActivity = {
  tab: 'resumes';
  uploads: Array<{
    id: string; filename: string; mime_type: string; size_bytes: number; parse_status: string; extraction_provider: string;
    extraction_note: string; created_at: string; resume_id: string | null; resume_name: string | null;
  }>;
  resumes: Array<{
    id: string; name: string; status: string; created_at: string; updated_at: string; version_count: number;
    export_count: number; last_generated_at: string | null;
  }>;
};
type ActivityPayload = PagedActivity | CourseActivity | ResumeActivity;
type TabKey = 'info' | 'history' | 'courses' | 'jobs' | 'interviews' | 'resumes';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'info', label: '用户信息' },
  { key: 'history', label: '操作历史' },
  { key: 'courses', label: '课程学习' },
  { key: 'jobs', label: '查看职位' },
  { key: 'interviews', label: '面试题集' },
  { key: 'resumes', label: '简历' },
];
const tabKeys = new Set<TabKey>(tabs.map((tab) => tab.key));
const roleLabels: Record<string, string> = { user: 'User', member: 'Member', operator: 'Operator', leader: 'Leader', admin: 'Administrator' };
const platformRoleLabels: Record<string, string> = { user: 'User', member: 'Member', operator: 'Operator', admin: 'Administrator' };
const categoryLabels: Record<string, string> = { general: '页面', course: '课程', job: '职位', interview: '面试题集', resume: '简历', admin: '管理后台' };
const eventLabels: Record<string, string> = { open: '开始学习', progress: '更新进度', complete: '完成学习' };

function dateValue(value: string | null | undefined) {
  if (!value) return '—';
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const parsed = new Date(hasZone ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(parsed);
}

function fileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1_048_576) return `${Math.max(1, Math.round(bytes / 1_024))} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function EmptyRow({ columns, children }: { columns: number; children: string }) {
  return <tr><td colSpan={columns} className="px-4 py-14 text-center text-sm text-slate-500">{children}</td></tr>;
}

function TablePager({ data, onPage }: { data: PagedActivity; onPage: (page: number) => void }) {
  return <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
    <span>共 {data.total.toLocaleString()} 条</span>
    <div className="flex items-center gap-2"><button disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">上一页</button><span className="px-2 tabular-nums">{data.page}</span><button disabled={data.page * data.limit >= data.total} onClick={() => onPage(data.page + 1)} className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">下一页</button></div>
  </div>;
}

function PageActivityTable({ data, mode, onPage }: { data: PagedActivity; mode: 'history' | 'jobs' | 'interviews'; onPage: (page: number) => void }) {
  const columns = mode === 'history' ? 4 : 3;
  return <section className="border border-slate-200 bg-white">
    <div className="overflow-x-auto"><table className={`w-full text-left text-sm ${mode === 'history' ? 'min-w-[840px]' : 'min-w-[700px]'}`}>
      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{mode === 'history' ? <th className="px-4 py-2.5 font-medium">类型</th> : null}<th className="px-4 py-2.5 font-medium">标题</th><th className="px-4 py-2.5 font-medium">路由</th><th className="px-4 py-2.5 text-right font-medium">时间</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{data.items.map((item) => <tr key={item.id} className="hover:bg-slate-50/70">{mode === 'history' ? <td className="px-4 py-3"><span className="bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-[#174d70] dark:text-blue-50">{categoryLabels[item.category] ?? item.category}</span></td> : null}<td className="max-w-sm px-4 py-3 font-medium text-slate-900">{item.page_title}</td><td className="px-4 py-3"><a href={item.route} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline dark:text-blue-200"><span className="max-w-[340px] truncate font-mono">{item.route}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></td><td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500">{dateValue(item.occurred_at)}</td></tr>)}{!data.items.length ? <EmptyRow columns={columns}>{mode === 'jobs' ? '该用户还没有查看职位' : mode === 'interviews' ? '该用户还没有查看面试题集' : '该用户还没有页面操作记录'}</EmptyRow> : null}</tbody>
    </table></div>
    <TablePager data={data} onPage={onPage} />
  </section>;
}

function CourseTables({ data }: { data: CourseActivity }) {
  return <div className="space-y-5">
    <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">学习课程</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">课程</th><th className="px-4 py-2.5 font-medium">进度</th><th className="px-4 py-2.5 font-medium">完成章节</th><th className="px-4 py-2.5 font-medium">状态</th><th className="px-4 py-2.5 font-medium">开始时间</th><th className="px-4 py-2.5 text-right font-medium">最后学习</th></tr></thead><tbody className="divide-y divide-slate-100">{data.courses.map((course) => <tr key={course.id}><td className="px-4 py-3"><a href={`/courses/${course.slug}`} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:text-blue-700 dark:hover:text-blue-200">{course.title}</a><p className="mt-0.5 font-mono text-[11px] text-slate-500">/courses/{course.slug}</p></td><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-1.5 w-28 overflow-hidden rounded-full bg-blue-100 dark:bg-[#244d76]"><span className="block h-full rounded-full bg-blue-600 dark:bg-blue-300" style={{ width: `${Math.max(0, Math.min(100, course.progress_percent))}%` }} /></div><span className="w-10 text-right text-xs tabular-nums">{course.progress_percent}%</span></div></td><td className="px-4 py-3 tabular-nums">{course.completed_chapters} / {course.chapter_count}</td><td className="px-4 py-3 text-slate-600">{course.completed_at ? '已完成' : course.enrollment_status === 'active' ? '学习中' : course.enrollment_status}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateValue(course.started_at)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500">{dateValue(course.last_read_at)}</td></tr>)}{!data.courses.length ? <EmptyRow columns={6}>该用户还没有课程学习记录</EmptyRow> : null}</tbody></table></div></section>
    <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">最近学习记录</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">操作</th><th className="px-4 py-2.5 font-medium">课程 / 章节</th><th className="px-4 py-2.5 font-medium">进度</th><th className="px-4 py-2.5 font-medium">路由</th><th className="px-4 py-2.5 text-right font-medium">时间</th></tr></thead><tbody className="divide-y divide-slate-100">{data.records.map((record) => { const route = `/courses/${record.course_slug}/chapters/${record.chapter_slug}`; return <tr key={record.id}><td className="px-4 py-3 text-xs font-medium">{eventLabels[record.event_type] ?? record.event_type}</td><td className="px-4 py-3"><p className="font-medium text-slate-900">{record.course_title}</p><p className="mt-0.5 text-xs text-slate-500">第 {record.chapter_number} 章 · {record.chapter_title}</p></td><td className="px-4 py-3 tabular-nums">{record.progress_percent}%</td><td className="px-4 py-3"><a href={route} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-700 hover:underline dark:text-blue-200">{route}</a></td><td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500">{dateValue(record.created_at)}</td></tr>; })}{!data.records.length ? <EmptyRow columns={5}>没有学习事件</EmptyRow> : null}</tbody></table></div></section>
  </div>;
}

function ResumeTables({ data }: { data: ResumeActivity }) {
  return <div className="space-y-5">
    <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">上传文件</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">文件</th><th className="px-4 py-2.5 font-medium">关联简历</th><th className="px-4 py-2.5 font-medium">解析状态</th><th className="px-4 py-2.5 font-medium">处理方式</th><th className="px-4 py-2.5 text-right font-medium">上传时间</th></tr></thead><tbody className="divide-y divide-slate-100">{data.uploads.map((upload) => <tr key={upload.id}><td className="px-4 py-3"><p className="font-medium text-slate-900">{upload.filename}</p><p className="mt-0.5 text-xs text-slate-500">{upload.mime_type} · {fileSize(upload.size_bytes)}</p></td><td className="px-4 py-3 text-slate-600">{upload.resume_name ?? '—'}</td><td className="px-4 py-3"><span className={upload.parse_status === 'parsed' ? 'text-emerald-700 dark:text-emerald-300' : upload.parse_status === 'failed' ? 'text-red-600 dark:text-red-300' : 'text-amber-700 dark:text-amber-200'}>{upload.parse_status === 'parsed' ? '已解析' : upload.parse_status === 'failed' ? '失败' : '待检查'}</span></td><td className="px-4 py-3 text-xs text-slate-500">{upload.extraction_provider}</td><td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500">{dateValue(upload.created_at)}</td></tr>)}{!data.uploads.length ? <EmptyRow columns={5}>该用户没有上传简历文件</EmptyRow> : null}</tbody></table></div></section>
    <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">创建的简历</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">名称</th><th className="px-4 py-2.5 font-medium">状态</th><th className="px-4 py-2.5 font-medium">生成版本</th><th className="px-4 py-2.5 font-medium">导出</th><th className="px-4 py-2.5 font-medium">创建时间</th><th className="px-4 py-2.5 text-right font-medium">更新时间</th></tr></thead><tbody className="divide-y divide-slate-100">{data.resumes.map((resume) => <tr key={resume.id}><td className="px-4 py-3"><p className="font-medium text-slate-900">{resume.name}</p><p className="mt-0.5 font-mono text-[11px] text-slate-500">{resume.id}</p></td><td className="px-4 py-3">{resume.status === 'completed' ? '已完成' : '草稿'}</td><td className="px-4 py-3 tabular-nums">{resume.version_count}</td><td className="px-4 py-3 tabular-nums">{resume.export_count}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateValue(resume.created_at)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500">{dateValue(resume.updated_at)}</td></tr>)}{!data.resumes.length ? <EmptyRow columns={6}>该用户还没有创建简历</EmptyRow> : null}</tbody></table></div></section>
  </div>;
}

export function AdminUserDetail() {
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = requestedTab && tabKeys.has(requestedTab) ? requestedTab : 'info';
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [form, setForm] = useState({ displayName: '', email: '', status: 'active', role: 'user', pointsDelta: '0', pointsReason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activity, setActivity] = useState<ActivityPayload | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [pages, setPages] = useState<Record<string, number>>({ history: 1, jobs: 1, interviews: 1 });
  const tabButtons = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});
  const tabScroller = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const scroller = tabScroller.current;
    const button = tabButtons.current[activeTab];
    if (!scroller || !button) return;
    scroller.scrollLeft = Math.max(0, button.offsetLeft - (scroller.clientWidth - button.offsetWidth) / 2);
  }, [activeTab, loading]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as UserDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '无法读取用户信息');
      return payload;
    }).then((payload) => {
      setDetail(payload);
      setForm({ displayName: payload.user.display_name, email: payload.user.email, status: payload.user.status, role: payload.user.platform_role, pointsDelta: '0', pointsReason: '' });
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : '无法读取用户信息');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [userId]);

  const activityPage = pages[activeTab] ?? 1;
  useEffect(() => {
    if (!userId || activeTab === 'info') { setActivity(null); return; }
    const controller = new AbortController();
    setActivityLoading(true); setActivity(null); setError('');
    const query = new URLSearchParams({ tab: activeTab, page: String(activityPage), limit: '50' });
    fetch(`/api/admin/users/${encodeURIComponent(userId)}/activity?${query}`, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as ActivityPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '无法读取用户记录');
      return payload;
    }).then(setActivity).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : '无法读取用户记录');
    }).finally(() => setActivityLoading(false));
    return () => controller.abort();
  }, [activeTab, activityPage, userId]);

  const summary = useMemo(() => detail?.activitySummary ?? { history: 0, jobs: 0, interviews: 0, courses: 0, uploads: 0, resumes: 0 }, [detail]);
  const tabCount = (tab: TabKey) => tab === 'history' ? summary.history : tab === 'courses' ? summary.courses : tab === 'jobs' ? summary.jobs : tab === 'interviews' ? summary.interviews : tab === 'resumes' ? summary.resumes : null;

  const chooseTab = (tab: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'info') next.delete('tab'); else next.set('tab', tab);
    setSearchParams(next, { replace: true });
    setSuccess('');
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(detail.user.id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, pointsDelta: Number(form.pointsDelta || 0), expectedUpdatedAt: detail.user.updated_at }),
      });
      const payload = await response.json().catch(() => ({})) as UserDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '保存失败');
      setDetail(payload);
      setForm({ displayName: payload.user.display_name, email: payload.user.email, status: payload.user.status, role: payload.user.platform_role, pointsDelta: '0', pointsReason: '' });
      setSuccess('用户信息已保存');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="border-y border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">正在加载用户…</div>;
  if (!detail) return <div className="space-y-4"><Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-blue-700 dark:text-blue-200"><ArrowLeft className="h-4 w-4" />返回用户列表</Link><p className="border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">{error || '找不到该用户'}</p></div>;

  const setPage = (page: number) => setPages((current) => ({ ...current, [activeTab]: page }));

  return <div className="space-y-5">
    <header className="border-b border-slate-200 pb-4">
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 hover:underline dark:text-blue-200"><ArrowLeft className="h-4 w-4" />返回用户列表</Link>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><h1 className="truncate text-xl font-semibold tracking-tight">{detail.user.display_name}</h1><p className="mt-1 truncate text-xs text-slate-500">{detail.user.email} · {detail.user.id}</p></div><div className="flex flex-wrap items-center gap-2 text-xs"><span className="bg-blue-50 px-2 py-1 font-semibold text-blue-800 dark:bg-[#174d70] dark:text-blue-50">{roleLabels[detail.user.role] ?? detail.user.role}</span><span className={detail.user.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}>{detail.user.status === 'active' ? '活跃' : '已停用'}</span></div></div>
    </header>

    <nav ref={tabScroller} aria-label="用户详情" className="overflow-x-auto border-b border-slate-200"><div role="tablist" className="flex min-w-max gap-1">{tabs.map((tab) => { const count = tabCount(tab.key); return <button ref={(element) => { tabButtons.current[tab.key] = element; }} key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => chooseTab(tab.key)} className={`border-b-2 px-3 py-2.5 text-sm font-medium ${activeTab === tab.key ? 'border-blue-700 text-blue-800 dark:border-blue-300 dark:text-blue-100' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}>{tab.label}{count !== null ? <span className="ml-1.5 text-[11px] tabular-nums opacity-70">{Number(count).toLocaleString()}</span> : null}</button>; })}</div></nav>

    {error ? <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">{error}</p> : null}
    {success ? <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-[#174c48] dark:text-emerald-100">{success}</p> : null}

    {activeTab === 'info' ? <form onSubmit={save} className="border border-slate-200 bg-white">
      <section className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="lg:col-span-2"><span className="text-xs font-medium text-slate-600">姓名</span><input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" /></label><label className="lg:col-span-2"><span className="text-xs font-medium text-slate-600">邮箱</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" /></label><label><span className="text-xs font-medium text-slate-600">平台身份</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm">{Object.entries(platformRoleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span className="text-xs font-medium text-slate-600">状态</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"><option value="active">活跃</option><option value="suspended">已停用</option></select></label><label><span className="text-xs font-medium text-slate-600">积分增减</span><input type="number" value={form.pointsDelta} onChange={(event) => setForm({ ...form, pointsDelta: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label><label><span className="text-xs font-medium text-slate-600">调整原因</span><input value={form.pointsReason} onChange={(event) => setForm({ ...form, pointsReason: event.target.value })} placeholder="积分不为 0 时必填" className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label></section>
      <section className="grid border-y border-slate-200 bg-slate-50 px-4 py-4 text-xs sm:grid-cols-2 lg:grid-cols-4"><dl className="grid grid-cols-[72px_1fr] gap-y-2"><dt className="text-slate-500">积分</dt><dd className="font-semibold tabular-nums">{Number(detail.user.points).toLocaleString()}</dd><dt className="text-slate-500">用户名</dt><dd>{detail.user.username ?? '—'}</dd></dl><dl className="mt-3 grid grid-cols-[72px_1fr] gap-y-2 sm:mt-0"><dt className="text-slate-500">组织</dt><dd>{detail.user.organization_id ? <Link to={`/admin/organizations/${detail.user.organization_id}`} className="font-medium text-blue-800 hover:underline dark:text-blue-100">{detail.user.organization_name}</Link> : '未归属'}</dd><dt className="text-slate-500">组织身份</dt><dd>{detail.user.organization_role === 'leader' ? 'Leader' : detail.user.organization_role === 'member' ? 'Member' : '—'}</dd></dl><dl className="mt-3 grid grid-cols-[72px_1fr] gap-y-2 lg:mt-0"><dt className="text-slate-500">创建</dt><dd>{dateValue(detail.user.created_at)}</dd><dt className="text-slate-500">验证</dt><dd>{dateValue(detail.user.email_verified_at)}</dd></dl><dl className="mt-3 grid grid-cols-[72px_1fr] gap-y-2 lg:mt-0"><dt className="text-slate-500">最后登录</dt><dd>{dateValue(detail.user.last_login_at)}</dd><dt className="text-slate-500">简介</dt><dd className="line-clamp-2">{detail.user.bio || '—'}</dd></dl></section>
      <section className="p-4"><h2 className="text-sm font-semibold">最近积分记录</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-2 font-medium">数量</th><th className="py-2 font-medium">原因</th><th className="py-2 font-medium">类型</th><th className="py-2 text-right font-medium">时间</th></tr></thead><tbody className="divide-y divide-slate-100">{detail.pointTransactions.map((item) => <tr key={item.id}><td className={`py-2.5 font-semibold ${item.amount >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>{item.amount > 0 ? '+' : ''}{item.amount}</td><td className="py-2.5 text-slate-600">{item.reason}</td><td className="py-2.5 text-slate-500">{item.reference_type ?? '—'}</td><td className="py-2.5 text-right text-slate-500">{dateValue(item.created_at)}</td></tr>)}{!detail.pointTransactions.length ? <EmptyRow columns={4}>没有积分记录</EmptyRow> : null}</tbody></table></div></section>
      <div className="flex items-center justify-end border-t border-slate-200 px-4 py-3"><button disabled={saving} className="admin-primary-action inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"><Save className="h-4 w-4" />{saving ? '保存中…' : '保存修改'}</button></div>
    </form> : null}

    {activeTab !== 'info' && activityLoading ? <div className="border-y border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">正在加载记录…</div> : null}
    {!activityLoading && activity && (activeTab === 'history' || activeTab === 'jobs' || activeTab === 'interviews') && 'items' in activity ? <PageActivityTable data={activity} mode={activeTab} onPage={setPage} /> : null}
    {!activityLoading && activity && activeTab === 'courses' && 'courses' in activity ? <CourseTables data={activity} /> : null}
    {!activityLoading && activity && activeTab === 'resumes' && 'uploads' in activity ? <ResumeTables data={activity} /> : null}
  </div>;
}
