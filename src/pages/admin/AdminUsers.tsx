import { Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type UserRow = {
  id: string; email: string; display_name: string; username: string | null; status: string; role: string;
  points: number; subscription_status: string | null; created_at: string; updated_at: string; last_login_at: string | null;
};
type UsersData = { users: UserRow[]; total: number; page: number; limit: number; summary: Record<string, number> };
type UserDetail = {
  user: UserRow & { timezone: string; bio: string; preferred_locale: string; email_verified_at: string | null };
  pointTransactions: Array<{ id: string; amount: number; reason: string; created_at: string }>;
};

const roleLabels: Record<string, string> = { user: 'User', member: 'Member', operator: 'Operator', admin: 'Administrator' };
const roleTone: Record<string, string> = { user: 'bg-slate-100 text-slate-700', member: 'bg-cyan-50 text-cyan-800', operator: 'bg-amber-50 text-amber-800', admin: 'bg-[#eaff9d] text-[#304000]' };

export function AdminUsers() {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersData | null>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', status: 'active', role: 'user', pointsDelta: '0', pointsReason: '' });

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), limit: '40' });
    if (query.trim()) value.set('q', query.trim());
    if (role) value.set('role', role);
    if (status) value.set('status', status);
    return value;
  }, [page, query, role, status]);

  const load = () => {
    setError('');
    fetch(`/api/admin/users?${params}`).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as UsersData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '无法加载用户');
      return payload;
    }).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : '无法加载用户'));
  };
  useEffect(load, [params]);

  async function openUser(userId: string) {
    setDetailLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`);
      const payload = await response.json() as UserDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '无法读取用户信息');
      setDetail(payload);
      setForm({ displayName: payload.user.display_name, email: payload.user.email, status: payload.user.status, role: payload.user.role, pointsDelta: '0', pointsReason: '' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : '无法读取用户信息'); }
    finally { setDetailLoading(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(detail.user.id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, pointsDelta: Number(form.pointsDelta || 0), expectedUpdatedAt: detail.user.updated_at }),
      });
      const payload = await response.json() as UserDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '保存失败');
      setDetail(payload);
      setForm({ displayName: payload.user.display_name, email: payload.user.email, status: payload.user.status, role: payload.user.role, pointsDelta: '0', pointsReason: '' });
      load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <div><h1 className="text-xl font-semibold tracking-tight">用户</h1><p className="mt-1 text-xs text-slate-500">资料、积分与访问身份</p></div>
    {data?.summary ? <section className="grid border-y border-slate-200 bg-white sm:grid-cols-5">{[
      ['全部', data.summary.total], ['活跃', data.summary.active], ['Member', data.summary.members], ['Operator', data.summary.operators], ['Administrator', data.summary.administrators],
    ].map(([label, value], index) => <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t border-slate-100 sm:border-l sm:border-t-0' : ''}`}><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{Number(value ?? 0).toLocaleString()}</p></div>)}</section> : null}

    <section className="border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 sm:max-w-md"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="姓名、邮箱或用户名" className="w-full bg-transparent text-sm outline-none" /></label>
        <div className="flex gap-2 overflow-x-auto"><span className="flex items-center px-1 text-slate-400"><SlidersHorizontal className="h-4 w-4" /></span><select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">全部身份</option>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">全部状态</option><option value="active">活跃</option><option value="suspended">已停用</option></select></div>
      </div>
      {error ? <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">用户</th><th className="px-4 py-2.5 font-medium">身份</th><th className="px-4 py-2.5 font-medium">积分</th><th className="px-4 py-2.5 font-medium">订阅</th><th className="px-4 py-2.5 font-medium">状态</th><th className="px-4 py-2.5 font-medium">最后登录</th><th className="px-4 py-2.5 text-right font-medium">操作</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{data?.users.map((user) => <tr key={user.id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><p className="font-medium text-slate-900">{user.display_name}</p><p className="mt-0.5 text-xs text-slate-500">{user.email}</p></td><td className="px-4 py-3"><span className={`inline-flex px-2 py-1 text-xs font-medium ${roleTone[user.role] ?? roleTone.user}`}>{roleLabels[user.role] ?? user.role}</span></td><td className="px-4 py-3 tabular-nums">{Number(user.points).toLocaleString()}</td><td className="px-4 py-3 text-slate-600">{user.subscription_status ?? '—'}</td><td className="px-4 py-3"><span className={user.status === 'active' ? 'text-emerald-700' : 'text-red-600'}>{user.status === 'active' ? '活跃' : '已停用'}</span></td><td className="px-4 py-3 text-xs text-slate-500">{user.last_login_at ?? '—'}</td><td className="px-4 py-3 text-right"><button disabled={detailLoading} onClick={() => void openUser(user.id)} className="border-b border-slate-400 text-xs font-semibold text-slate-700 hover:border-slate-950">查看 / 编辑</button></td></tr>)}{!data?.users.length ? <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-500">没有符合条件的用户</td></tr> : null}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>共 {data?.total ?? 0} 位用户</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="border border-slate-200 px-3 py-1.5 disabled:opacity-40">上一页</button><span className="px-2 py-1.5">{page}</span><button disabled={!data || page * data.limit >= data.total} onClick={() => setPage((value) => value + 1)} className="border border-slate-200 px-3 py-1.5 disabled:opacity-40">下一页</button></div></div>
    </section>

    {detail ? <div className="fixed inset-0 z-[80] flex justify-end"><button aria-label="关闭用户编辑" className="admin-overlay absolute inset-0" onClick={() => setDetail(null)} /><aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 className="text-base font-semibold">{detail.user.display_name}</h2><p className="mt-0.5 text-xs text-slate-500">{detail.user.id}</p></div><button onClick={() => setDetail(null)} className="p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭"><X className="h-5 w-5" /></button></div><form onSubmit={save} className="divide-y divide-slate-200">
      <section className="grid gap-4 p-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs font-medium text-slate-600">姓名</span><input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-700" /></label><label className="sm:col-span-2"><span className="text-xs font-medium text-slate-600">邮箱</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-700" /></label><label><span className="text-xs font-medium text-slate-600">身份</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm">{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span className="text-xs font-medium text-slate-600">状态</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"><option value="active">活跃</option><option value="suspended">已停用</option></select></label></section>
      <section className="p-5"><div className="flex items-baseline justify-between"><h3 className="text-sm font-semibold">积分调整</h3><span className="text-2xl font-semibold tabular-nums">{Number(detail.user.points).toLocaleString()}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]"><label><span className="text-xs font-medium text-slate-600">增减数量</span><input type="number" value={form.pointsDelta} onChange={(event) => setForm({ ...form, pointsDelta: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label><label><span className="text-xs font-medium text-slate-600">调整原因</span><input value={form.pointsReason} onChange={(event) => setForm({ ...form, pointsReason: event.target.value })} placeholder="积分不为 0 时必填" className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label></div></section>
      <section className="p-5"><h3 className="text-sm font-semibold">账户信息</h3><dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-2 text-xs"><dt className="text-slate-500">用户名</dt><dd>{detail.user.username ?? '—'}</dd><dt className="text-slate-500">时区</dt><dd>{detail.user.timezone}</dd><dt className="text-slate-500">创建时间</dt><dd>{detail.user.created_at}</dd><dt className="text-slate-500">最后登录</dt><dd>{detail.user.last_login_at ?? '—'}</dd><dt className="text-slate-500">邮箱验证</dt><dd>{detail.user.email_verified_at ?? '未验证'}</dd></dl></section>
      <section className="p-5"><h3 className="text-sm font-semibold">最近积分记录</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[430px] text-left text-xs"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-2 font-medium">数量</th><th className="py-2 font-medium">原因</th><th className="py-2 text-right font-medium">时间</th></tr></thead><tbody className="divide-y divide-slate-100">{detail.pointTransactions.map((item) => <tr key={item.id}><td className={`py-2.5 font-semibold ${item.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{item.amount > 0 ? '+' : ''}{item.amount}</td><td className="py-2.5 text-slate-600">{item.reason}</td><td className="py-2.5 text-right text-slate-500">{item.created_at}</td></tr>)}</tbody></table></div></section>
      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setDetail(null)} className="px-4 py-2 text-sm text-slate-600">取消</button><button disabled={saving} className="admin-primary-action px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{saving ? '保存中…' : '保存修改'}</button></div>
    </form></aside></div> : null}
  </div>;
}
