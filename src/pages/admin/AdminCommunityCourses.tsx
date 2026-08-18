import { Check, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminCourseTrend } from '../../components/admin/AdminCourseTrend';

type CommunityCourse = { id: string; slug: string; title: string; summary: string; language: string; status: string; review_note: string | null; points_awarded: number; created_at: string; updated_at: string; creator_name: string; creator_email: string; click_count: number; learner_count: number };
type CommunityData = { courses: CommunityCourse[]; selected: CommunityCourse | null; trend: Array<{ day: string; clicks: number; learners: number }> };
const managedStatuses = [['published', '发布'], ['draft', '草稿'], ['expired', '过期'], ['blocked', '屏蔽']] as const;

export function AdminCommunityCourses() {
  const [status, setStatus] = useState('');
  const [courseId, setCourseId] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<CommunityData | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    const params = new URLSearchParams(); if (status) params.set('status', status); if (courseId) params.set('courseId', courseId);
    fetch(`/api/admin/courses/community?${params}`).then(async (response) => {
      const payload = await response.json() as CommunityData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '无法加载用户课程');
      return payload;
    }).then((payload) => { setData(payload); setPending(Object.fromEntries(payload.courses.map((course) => [course.id, managedStatuses.some(([key]) => key === course.status) ? course.status : 'draft']))); if (!courseId && payload.selected) setCourseId(payload.selected.id); }).catch((reason) => setMessage(reason instanceof Error ? reason.message : '无法加载用户课程'));
  };
  useEffect(load, [status, courseId]);

  const filtered = useMemo(() => data?.courses.filter((course) => !query.trim() || `${course.title} ${course.creator_name} ${course.creator_email}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [], [data?.courses, query]);

  async function saveStatus(course: CommunityCourse) {
    setSaving(course.id); setMessage('');
    try {
      const response = await fetch(`/api/admin/courses/community/${encodeURIComponent(course.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: pending[course.id], expectedUpdatedAt: course.updated_at }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '状态保存失败');
      setMessage(`“${course.title}”状态已更新`); load();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '状态保存失败'); }
    finally { setSaving(''); }
  }

  const selected = data?.selected;
  return <div className="space-y-5">
    <div><h1 className="text-xl font-semibold tracking-tight">用户课程</h1><p className="mt-1 text-xs text-slate-500">发布、草稿、过期与屏蔽状态</p></div>
    {message ? <p className="border-l-2 border-teal-700 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</p> : null}
    {selected ? <section className="border border-slate-200 bg-white"><div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{selected.title}</h2><p className="mt-0.5 text-xs text-slate-500">{selected.creator_name} · 点击 {selected.click_count} · 学习用户 {selected.learner_count}</p></div><span className="text-xs text-slate-500">近 30 天</span></div><div className="px-2 py-3 sm:px-4"><AdminCourseTrend data={data?.trend ?? []} /></div></section> : null}
    <section className="border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row"><label className="flex flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 sm:max-w-md"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="课程、创建者或邮箱" className="w-full bg-transparent text-sm outline-none" /></label><select value={status} onChange={(event) => { setStatus(event.target.value); setCourseId(''); }} className="border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">全部状态</option>{managedStatuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="submitted">待审核</option><option value="recommended">已推荐</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">课程</th><th className="px-4 py-2.5 font-medium">创建者</th><th className="px-4 py-2.5 font-medium">语言</th><th className="px-4 py-2.5 text-right font-medium">点击</th><th className="px-4 py-2.5 text-right font-medium">学习</th><th className="px-4 py-2.5 font-medium">当前状态</th><th className="px-4 py-2.5 font-medium">设定状态</th><th className="px-4 py-2.5 text-right font-medium">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((course) => <tr key={course.id} className={course.id === selected?.id ? 'bg-lime-50/40 dark:bg-blue-900/35' : 'hover:bg-slate-50'}><td className="max-w-[330px] px-4 py-3"><button onClick={() => setCourseId(course.id)} className="text-left"><span className="block font-medium text-slate-900 hover:underline">{course.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{course.summary}</span></button></td><td className="px-4 py-3"><p>{course.creator_name}</p><p className="text-xs text-slate-500">{course.creator_email}</p></td><td className="px-4 py-3 text-slate-600">{course.language}</td><td className="px-4 py-3 text-right tabular-nums">{course.click_count}</td><td className="px-4 py-3 text-right tabular-nums">{course.learner_count}</td><td className="px-4 py-3"><span className="bg-slate-100 px-2 py-1 text-xs">{managedStatuses.find(([key]) => key === course.status)?.[1] ?? course.status}</span></td><td className="px-4 py-3"><select value={pending[course.id] ?? 'draft'} onChange={(event) => setPending({ ...pending, [course.id]: event.target.value })} className="border border-slate-200 bg-white px-2 py-1.5 text-xs">{managedStatuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td><td className="px-4 py-3 text-right"><button disabled={saving === course.id || pending[course.id] === course.status} onClick={() => void saveStatus(course)} className="admin-primary-action inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:bg-slate-200 disabled:text-slate-500"><Check className="h-3.5 w-3.5" />保存</button></td></tr>)}{!filtered.length ? <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-500">没有符合条件的用户课程</td></tr> : null}</tbody></table></div>
    </section>
  </div>;
}
