import { ArrowUpRight, BookOpenCheck, BriefcaseBusiness, DatabaseZap, Network, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type OverviewData = {
  summary: Record<string, number>;
  trend: Array<{ day: string; clicks: number; learners: number }>;
  recent: Array<{ action: string; entity_type: string; entity_id: string; created_at: string }>;
};

const metrics = [
  ['users', '用户', UsersRound],
  ['system_courses', '自有课程', BookOpenCheck],
  ['creator_courses', '用户课程', BookOpenCheck],
  ['skills', '知识点', Network],
  ['active_sources', '启用来源', DatabaseZap],
  ['published_jobs', '已发布职位', BriefcaseBusiness],
] as const;

const quickLinks = [
  ['/admin/users', '管理用户、积分与身份'],
  ['/admin/courses', '查看课程章节表现'],
  ['/admin/community-courses', '审核用户生成课程状态'],
  ['/admin/knowledge-graph', '查看知识点与图谱关系'],
] as const;

export function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/admin/overview').then(async (response) => {
      if (!response.ok) throw new Error('无法加载概览');
      return response.json() as Promise<OverviewData>;
    }).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : '无法加载概览'));
  }, []);

  if (error) return <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="py-20 text-center text-sm text-slate-500">正在载入管理数据…</p>;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-semibold tracking-tight">运营概览</h1><p className="mt-1 text-xs text-slate-500">课程、用户、知识图谱和职位数据</p></div>
        <p className="text-xs text-slate-500">更新时间 {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</p>
      </div>

      <section className="grid overflow-hidden border-y border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map(([key, label, Icon], index) => (
          <div key={key} className={`px-4 py-4 ${index ? 'border-t border-slate-100 sm:border-l sm:border-t-0' : ''}`}>
            <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{label}</span><Icon className="h-4 w-4 text-slate-400" /></div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{Number(data.summary[key] ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold">近 14 天课程表现</h2>
            <span className="text-xs text-slate-500">点击 {Number(data.summary.course_clicks ?? 0).toLocaleString()} · 学习用户 {Number(data.summary.learners ?? 0).toLocaleString()}</span>
          </div>
          <div className="h-[310px] px-2 py-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
                <defs><linearGradient id="overviewClicks" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.3} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--admin-chart-grid)" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(value) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
                <Tooltip contentStyle={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-panel)', color: 'var(--admin-text)', borderRadius: 6, fontSize: 12 }} />
                <Area type="monotone" dataKey="clicks" name="点击" stroke="#0f766e" fill="url(#overviewClicks)" strokeWidth={2} />
                <Area type="monotone" dataKey="learners" name="学习用户" stroke="#84a700" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">常用入口</h2>
          <div className="divide-y divide-slate-100">
            {quickLinks.map(([path, label]) => <Link key={path} to={path} className="flex items-center justify-between px-4 py-4 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950"><span>{label}</span><ArrowUpRight className="h-4 w-4 text-slate-400" /></Link>)}
          </div>
        </section>
      </div>

      <section className="border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">最近管理操作</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">操作</th><th className="px-4 py-2.5 font-medium">对象</th><th className="px-4 py-2.5 font-medium">对象 ID</th><th className="px-4 py-2.5 text-right font-medium">时间</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{data.recent.length ? data.recent.map((item, index) => <tr key={`${item.entity_id}-${index}`}><td className="px-4 py-3 font-medium">{item.action}</td><td className="px-4 py-3 text-slate-600">{item.entity_type}</td><td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-slate-500">{item.entity_id}</td><td className="px-4 py-3 text-right text-xs text-slate-500">{item.created_at}</td></tr>) : <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">暂无管理操作</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
