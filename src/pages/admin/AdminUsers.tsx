import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type UserRow = {
  id: string; email: string; display_name: string; username: string | null; status: string; role: string;
  points: number; subscription_status: string | null; created_at: string; updated_at: string; last_login_at: string | null;
  organization_id: string | null; organization_name: string | null; organization_public_id: string | null; organization_role: string | null;
};
type UsersData = { users: UserRow[]; total: number; page: number; limit: number; summary: Record<string, number> };

const roleLabels: Record<string, string> = { user: 'User', member: 'Member', operator: 'Operator', leader: 'Leader', admin: 'Administrator' };
const roleTone: Record<string, string> = {
  user: 'bg-slate-100 text-slate-700',
  member: 'bg-cyan-50 text-cyan-800 dark:bg-[#174d70] dark:text-cyan-50',
  operator: 'bg-amber-50 text-amber-800 dark:bg-[#5a4820] dark:text-amber-50',
  leader: 'bg-blue-50 text-blue-800 dark:bg-[#174d70] dark:text-blue-50',
  admin: 'bg-[#eaff9d] text-[#304000] dark:bg-[#416414] dark:text-[#f2ffd0]',
};

export function AdminUsers() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersData | null>(null);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), limit: '40' });
    if (query.trim()) value.set('q', query.trim());
    if (role) value.set('role', role);
    if (status) value.set('status', status);
    return value;
  }, [page, query, role, status]);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`/api/admin/users?${params}`, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as UsersData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '无法加载用户');
      return payload;
    }).then(setData).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : '无法加载用户');
    });
    return () => controller.abort();
  }, [params]);

  const openUser = (userId: string) => navigate(`/admin/users/${encodeURIComponent(userId)}`);

  return <div className="space-y-5">
    <div><h1 className="text-xl font-semibold tracking-tight">用户</h1><p className="mt-1 text-xs text-slate-500">资料、积分与访问身份</p></div>
    {data?.summary ? <section className="grid border-y border-slate-200 bg-white sm:grid-cols-3 xl:grid-cols-6">{[
      ['全部', data.summary.total], ['活跃', data.summary.active], ['Member', data.summary.members], ['Operator', data.summary.operators], ['Leader', data.summary.leaders], ['Administrator', data.summary.administrators],
    ].map(([label, value], index) => <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t border-slate-100 sm:border-l sm:border-t-0' : ''}`}><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{Number(value ?? 0).toLocaleString()}</p></div>)}</section> : null}

    <section className="border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 sm:max-w-md"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="姓名、邮箱或用户名" className="w-full bg-transparent text-sm outline-none" /></label>
        <div className="flex gap-2 overflow-x-auto"><span className="flex items-center px-1 text-slate-400"><SlidersHorizontal className="h-4 w-4" /></span><select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">全部身份</option>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">全部状态</option><option value="active">活跃</option><option value="suspended">已停用</option></select></div>
      </div>
      {error ? <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">用户</th><th className="px-4 py-2.5 font-medium">身份</th><th className="px-4 py-2.5 font-medium">组织</th><th className="px-4 py-2.5 font-medium">积分</th><th className="px-4 py-2.5 font-medium">订阅</th><th className="px-4 py-2.5 font-medium">状态</th><th className="px-4 py-2.5 font-medium">最后登录</th><th className="px-4 py-2.5 text-right font-medium">详情</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{data?.users.map((user) => {
            const path = `/admin/users/${encodeURIComponent(user.id)}`;
            return <tr
              key={user.id}
              role="link"
              tabIndex={0}
              aria-label={`查看用户 ${user.display_name}`}
              onClick={() => openUser(user.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openUser(user.id); }
              }}
              className="cursor-pointer outline-none hover:bg-slate-50/70 focus-visible:bg-blue-50 dark:focus-visible:bg-[#173f69]"
            >
              <td className="px-4 py-3"><Link to={path} onClick={(event) => event.stopPropagation()} className="font-medium text-slate-900 hover:text-blue-700 dark:hover:text-blue-200">{user.display_name}</Link><p className="mt-0.5 text-xs text-slate-500">{user.email}</p></td>
              <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 text-xs font-medium ${roleTone[user.role] ?? roleTone.user}`}>{roleLabels[user.role] ?? user.role}</span></td>
              <td className="px-4 py-3">{user.organization_id ? <Link to={`/admin/organizations/${user.organization_id}`} onClick={(event) => event.stopPropagation()} className="text-xs font-medium text-blue-800 hover:underline dark:text-blue-100">{user.organization_name}<span className="block font-mono text-[10px] text-slate-500">{user.organization_public_id}</span></Link> : <span className="text-slate-400">—</span>}</td>
              <td className="px-4 py-3 tabular-nums">{Number(user.points).toLocaleString()}</td>
              <td className="px-4 py-3 text-slate-600">{user.subscription_status ?? '—'}</td>
              <td className="px-4 py-3"><span className={user.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}>{user.status === 'active' ? '活跃' : '已停用'}</span></td>
              <td className="px-4 py-3 text-xs text-slate-500">{user.last_login_at ?? '—'}</td>
              <td className="px-4 py-3"><span className="flex items-center justify-end gap-1 text-xs font-semibold text-blue-700 dark:text-blue-200">查看 <ChevronRight className="h-4 w-4" /></span></td>
            </tr>;
          })}{!data?.users.length ? <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-500">没有符合条件的用户</td></tr> : null}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>共 {data?.total ?? 0} 位用户</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">上一页</button><span className="px-2 py-1.5">{page}</span><button disabled={!data || page * data.limit >= data.total} onClick={() => setPage((value) => value + 1)} className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">下一页</button></div></div>
    </section>
  </div>;
}
