import { ArrowLeft, ChevronRight, Cpu, DatabaseZap, Gauge, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Period = 'day' | 'week' | 'month';
type UsageBucket = {
  bucket: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  estimatedTokens: number;
  failedRequests: number;
};
type UsageSummary = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  users: number;
  estimatedTokens: number;
  failedRequests: number;
};
type FeatureUsage = UsageBucket & { feature: string };
type ProviderUsage = { provider: string; model: string; totalTokens: number; requests: number; estimatedTokens: number };
type UsageUser = {
  userId: string;
  displayName: string;
  email: string | null;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  estimatedTokens: number;
  lastUsedAt: string;
};
type OverviewPayload = {
  period: Period;
  summary: UsageSummary;
  series: Record<Period, UsageBucket[]>;
  byFeature: FeatureUsage[];
  byProvider: ProviderUsage[];
  users: UsageUser[];
};
type UserPayload = {
  user: { id: string; displayName: string; email: string | null };
  summary: UsageSummary;
  series: Record<Period, UsageBucket[]>;
  byFeature: Record<Period, FeatureUsage[]>;
  byProvider: ProviderUsage[];
  recent: Array<{
    id: string;
    feature: string;
    operation: string;
    provider: string;
    model: string;
    itemType: string | null;
    itemId: string | null;
    itemLabel: string | null;
    route: string | null;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimated: boolean;
    requests: number;
    status: string;
    durationMs: number | null;
    createdAt: string;
  }>;
};

const periods: Array<{ value: Period; label: string; description: string }> = [
  { value: 'day', label: '日', description: '近 30 天' },
  { value: 'week', label: '周', description: '近 12 周' },
  { value: 'month', label: '月', description: '近 12 月' },
];

const featureLabels: Record<string, string> = {
  resume_extract: '简历识别',
  resume_generate: '简历生成',
  knowledge_graph: '知识图谱',
  curriculum_localization: '课程多语言重写',
  job_embedding: '职位向量索引',
};

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function featureName(value: string) {
  return featureLabels[value] ?? value;
}

function SummaryCards({ summary }: { summary: UsageSummary }) {
  const cards = [
    { label: '30 天总 Token', value: summary.totalTokens, icon: Gauge },
    { label: '请求次数', value: summary.requests, icon: Cpu },
    { label: '使用用户', value: summary.users, icon: UsersRound },
    { label: '估算 Token', value: summary.estimatedTokens, icon: DatabaseZap },
  ];
  return <section className="grid overflow-hidden border-y border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
    {cards.map(({ label, value, icon: Icon }, index) => (
      <div key={label} className={`px-4 py-4 ${index ? 'border-t border-slate-100 sm:border-l sm:border-t-0' : ''}`}>
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{label}</span><Icon className="h-4 w-4 text-slate-400" /></div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
      </div>
    ))}
  </section>;
}

function PeriodTabs({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-sm">
    {periods.map((item) => (
      <button
        key={item.value}
        onClick={() => onChange(item.value)}
        className={`rounded px-3 py-1.5 ${period === item.value ? 'admin-primary-action' : 'text-slate-600 hover:bg-slate-50'}`}
        title={item.description}
      >
        {item.label}
      </button>
    ))}
  </div>;
}

function UsageChart({ data }: { data: UsageBucket[] }) {
  return <div className="h-[320px] px-2 py-4 sm:px-4">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 14, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="var(--admin-chart-grid)" vertical={false} />
        <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
        <Tooltip contentStyle={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-panel)', color: 'var(--admin-text)', borderRadius: 6, fontSize: 12 }} />
        <Bar dataKey="promptTokens" name="Prompt tokens" stackId="tokens" fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completionTokens" name="Completion tokens" stackId="tokens" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

function ProviderTable({ providers }: { providers: ProviderUsage[] }) {
  return <section className="border border-slate-200 bg-white">
    <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">供应商与模型</h2>
    <div className="divide-y divide-slate-100">
      {providers.length ? providers.map((provider) => (
        <div key={`${provider.provider}:${provider.model}`} className="px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{provider.provider}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{provider.model}</p>
            </div>
            <p className="text-right font-semibold tabular-nums">{formatNumber(provider.totalTokens)}</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">请求 {formatNumber(provider.requests)} · 估算 {formatNumber(provider.estimatedTokens)}</p>
        </div>
      )) : <p className="px-4 py-10 text-center text-sm text-slate-500">暂无模型调用记录</p>}
    </div>
  </section>;
}

function FeatureTable({ rows }: { rows: FeatureUsage[] }) {
  return <section className="border border-slate-200 bg-white">
    <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">按功能拆分</h2>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">周期</th><th className="px-4 py-2.5 font-medium">功能</th><th className="px-4 py-2.5 text-right font-medium">请求</th><th className="px-4 py-2.5 text-right font-medium">Prompt</th><th className="px-4 py-2.5 text-right font-medium">Completion</th><th className="px-4 py-2.5 text-right font-medium">Total</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map((row) => <tr key={`${row.bucket}:${row.feature}`}><td className="px-4 py-3 font-mono text-xs text-slate-500">{row.bucket}</td><td className="px-4 py-3 font-medium">{featureName(row.feature)}</td><td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.requests)}</td><td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.promptTokens)}</td><td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.completionTokens)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNumber(row.totalTokens)}</td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">暂无功能消耗记录</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}

function OverviewPage({ data, period, setPeriod }: { data: OverviewPayload; period: Period; setPeriod: (period: Period) => void }) {
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-semibold tracking-tight">Token usage 流量使用</h1><p className="mt-1 text-xs text-slate-500">DeepSeek、MegaNova GPT 与 Workers AI 的模型调用消耗</p></div>
      <PeriodTabs period={period} onChange={setPeriod} />
    </div>
    <SummaryCards summary={data.summary} />
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Token 趋势</h2>
          <span className="text-xs text-slate-500">{periods.find((item) => item.value === period)?.description}</span>
        </div>
        <UsageChart data={data.series[period]} />
      </section>
      <ProviderTable providers={data.byProvider} />
    </div>
    <FeatureTable rows={data.byFeature} />
    <section className="border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">用户流量排行（近 30 天）</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">用户</th><th className="px-4 py-2.5 text-right font-medium">请求</th><th className="px-4 py-2.5 text-right font-medium">Prompt</th><th className="px-4 py-2.5 text-right font-medium">Completion</th><th className="px-4 py-2.5 text-right font-medium">Total</th><th className="px-4 py-2.5 text-right font-medium">估算</th><th className="px-4 py-2.5 font-medium">最近使用</th><th className="px-4 py-2.5 text-right font-medium">详情</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.users.length ? data.users.map((user) => <tr key={user.userId} className="hover:bg-slate-50/70">
              <td className="px-4 py-3"><Link to={`/admin/token-usage/users/${encodeURIComponent(user.userId)}`} className="font-medium text-slate-900 hover:text-blue-700">{user.displayName}</Link><p className="mt-0.5 text-xs text-slate-500">{user.email ?? (user.userId === 'system' ? '后台任务、定时任务、管理员构建脚本' : user.userId)}</p></td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(user.requests)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(user.promptTokens)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(user.completionTokens)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNumber(user.totalTokens)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(user.estimatedTokens)}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{formatTime(user.lastUsedAt)}</td>
              <td className="px-4 py-3"><Link to={`/admin/token-usage/users/${encodeURIComponent(user.userId)}`} className="flex items-center justify-end gap-1 text-xs font-semibold text-blue-700">查看 <ChevronRight className="h-4 w-4" /></Link></td>
            </tr>) : <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-500">暂无用户 Token 消耗记录</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

function UserDetailPage({ data, period, setPeriod }: { data: UserPayload; period: Period; setPeriod: (period: Period) => void }) {
  const rows = data.byFeature[period] ?? [];
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link to="/admin/token-usage" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700"><ArrowLeft className="h-4 w-4" />返回流量总览</Link>
        <h1 className="text-xl font-semibold tracking-tight">{data.user.displayName}</h1>
        <p className="mt-1 text-xs text-slate-500">{data.user.email ?? 'System / automation'} · 近 30 天 Token 消耗</p>
      </div>
      <PeriodTabs period={period} onChange={setPeriod} />
    </div>
    <SummaryCards summary={data.summary} />
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">用户 Token 趋势</h2></div>
        <UsageChart data={data.series[period]} />
      </section>
      <ProviderTable providers={data.byProvider} />
    </div>
    <FeatureTable rows={rows} />
    <section className="border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">最近调用事件</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">时间</th><th className="px-4 py-2.5 font-medium">功能</th><th className="px-4 py-2.5 font-medium">模型</th><th className="px-4 py-2.5 font-medium">对象</th><th className="px-4 py-2.5 text-right font-medium">请求</th><th className="px-4 py-2.5 text-right font-medium">Prompt</th><th className="px-4 py-2.5 text-right font-medium">Completion</th><th className="px-4 py-2.5 text-right font-medium">Total</th><th className="px-4 py-2.5 font-medium">状态</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.recent.length ? data.recent.map((event) => <tr key={event.id}>
              <td className="px-4 py-3 text-xs text-slate-500">{formatTime(event.createdAt)}</td>
              <td className="px-4 py-3 font-medium">{featureName(event.feature)}<p className="mt-0.5 text-xs text-slate-500">{event.operation}</p></td>
              <td className="px-4 py-3">{event.provider}<p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{event.model}</p></td>
              <td className="px-4 py-3"><p className="max-w-[260px] truncate">{event.itemLabel ?? event.itemType ?? '—'}</p><p className="mt-0.5 max-w-[260px] truncate font-mono text-[11px] text-slate-500">{event.itemId ?? event.route ?? '—'}</p></td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(event.requests)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(event.promptTokens)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(event.completionTokens)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNumber(event.totalTokens)}{event.estimated ? <span className="ml-1 text-[10px] font-normal text-amber-600">估</span> : null}</td>
              <td className={event.status === 'failed' ? 'px-4 py-3 text-red-600' : 'px-4 py-3 text-emerald-700'}>{event.status === 'failed' ? '失败' : '完成'}</td>
            </tr>) : <tr><td colSpan={9} className="px-4 py-14 text-center text-slate-500">暂无调用事件</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

export function AdminTokenUsage() {
  const { userId } = useParams();
  const [period, setPeriod] = useState<Period>('day');
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [detail, setDetail] = useState<UserPayload | null>(null);
  const [error, setError] = useState('');
  const endpoint = useMemo(() => userId ? `/api/admin/token-usage/users/${encodeURIComponent(userId)}` : `/api/admin/token-usage?period=${period}`, [period, userId]);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    if (userId) setDetail(null);
    else setOverview(null);
    fetch(endpoint, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as (OverviewPayload | UserPayload) & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '无法加载 Token 使用数据');
      if (userId) setDetail(payload as UserPayload);
      else setOverview(payload as OverviewPayload);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : '无法加载 Token 使用数据');
    });
    return () => controller.abort();
  }, [endpoint, userId]);

  if (error) return <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (userId) {
    if (!detail) return <p className="py-20 text-center text-sm text-slate-500">正在载入用户 Token 使用数据…</p>;
    return <UserDetailPage data={detail} period={period} setPeriod={setPeriod} />;
  }
  if (!overview) return <p className="py-20 text-center text-sm text-slate-500">正在载入 Token 使用数据…</p>;
  return <OverviewPage data={overview} period={period} setPeriod={setPeriod} />;
}
