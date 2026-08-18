import { DatabaseZap, Play, Plus, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type Source = { id: string; source_type: string; board_token: string; official_career_url: string; acquisition_policy: string; display_policy: string; enabled: number; polling_minutes: number; last_fetched_at: string | null; next_fetch_at: string | null; consecutive_failures: number; updated_at: string; company_name: string; company_slug: string; last_run_status: string | null; job_count: number };

export function AdminJobSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ companyName: '', companySlug: '', sourceType: 'greenhouse', boardToken: '', officialCareerUrl: '', displayPolicy: 'full_text_authorized', termsUrl: '' });
  const load = () => fetch('/api/admin/job-sources').then(async (response) => {
    const payload = await response.json() as { sources?: Source[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? '无法加载职位来源');
    return payload.sources ?? [];
  }).then(setSources).catch((reason) => setMessage(reason instanceof Error ? reason.message : '无法加载职位来源'));
  useEffect(load, []);

  async function update(source: Source, enabled = Boolean(source.enabled)) {
    setBusy(source.id); setMessage('');
    try {
      const response = await fetch(`/api/admin/job-sources/${encodeURIComponent(source.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled, pollingMinutes: source.polling_minutes, displayPolicy: source.display_policy, expectedUpdatedAt: source.updated_at }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '来源保存失败');
      setMessage(`${source.company_name} 来源已更新`); load();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '来源保存失败'); }
    finally { setBusy(''); }
  }

  async function sync(source: Source) {
    setBusy(source.id); setMessage('');
    try {
      const response = await fetch(`/api/admin/job-sources/${encodeURIComponent(source.id)}/sync`, { method: 'POST' });
      const payload = await response.json() as { error?: string; runId?: string };
      if (!response.ok) throw new Error(payload.error ?? '同步启动失败');
      setMessage(`${source.company_name} 已进入同步队列 · ${payload.runId ?? ''}`); setTimeout(load, 1200);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '同步启动失败'); }
    finally { setBusy(''); }
  }

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy('create'); setMessage('');
    try {
      const response = await fetch('/api/admin/job-sources', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? '来源创建失败');
      setMessage('职位来源已创建'); setCreating(false); setForm({ companyName: '', companySlug: '', sourceType: 'greenhouse', boardToken: '', officialCareerUrl: '', displayPolicy: 'full_text_authorized', termsUrl: '' }); load();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '来源创建失败'); }
    finally { setBusy(''); }
  }

  return <div className="space-y-5">
    <div className="flex items-end justify-between gap-3"><div><h1 className="text-xl font-semibold tracking-tight">职位来源</h1><p className="mt-1 text-xs text-slate-500">官方 ATS、抓取策略和同步状态</p></div><button onClick={() => setCreating((value) => !value)} className="admin-primary-action inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">{creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{creating ? '关闭' : '添加来源'}</button></div>
    {message ? <p className="border-l-2 border-teal-700 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</p> : null}
    {creating ? <form onSubmit={create} className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">新建官方来源</h2></div><div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4"><label><span className="text-xs text-slate-600">公司名称</span><input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label><label><span className="text-xs text-slate-600">公司 slug（可选）</span><input value={form.companySlug} onChange={(event) => setForm({ ...form, companySlug: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label><label><span className="text-xs text-slate-600">来源类型</span><select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="json_ld">JSON-LD 官方结构</option></select></label><label><span className="text-xs text-slate-600">Board token</span><input required value={form.boardToken} onChange={(event) => setForm({ ...form, boardToken: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs text-slate-600">官方招聘网址</span><input required type="url" value={form.officialCareerUrl} onChange={(event) => setForm({ ...form, officialCareerUrl: event.target.value })} placeholder="https://" className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label><label><span className="text-xs text-slate-600">展示策略</span><select value={form.displayPolicy} onChange={(event) => setForm({ ...form, displayPolicy: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"><option value="full_text_authorized">授权全文</option><option value="excerpt">摘要</option><option value="metadata_only">仅元数据</option></select></label><label><span className="text-xs text-slate-600">条款网址（可选）</span><input type="url" value={form.termsUrl} onChange={(event) => setForm({ ...form, termsUrl: event.target.value })} placeholder="https://" className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm" /></label></div><div className="flex justify-end border-t border-slate-200 px-4 py-3"><button disabled={busy === 'create'} className="admin-primary-action px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{busy === 'create' ? '创建中…' : '创建来源'}</button></div></form> : null}
    <section className="border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-medium">公司 / 来源</th><th className="px-4 py-2.5 font-medium">采集策略</th><th className="px-4 py-2.5 font-medium">展示</th><th className="px-4 py-2.5 text-right font-medium">职位</th><th className="px-4 py-2.5 font-medium">上次抓取</th><th className="px-4 py-2.5 font-medium">下次抓取</th><th className="px-4 py-2.5 text-right font-medium">失败</th><th className="px-4 py-2.5 font-medium">启用</th><th className="px-4 py-2.5 text-right font-medium">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{sources.map((source) => <tr key={source.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 items-center justify-center bg-slate-100 text-slate-600"><DatabaseZap className="h-4 w-4" /></span><div><p className="font-medium">{source.company_name}</p><p className="mt-0.5 font-mono text-[11px] text-slate-500">{source.source_type} · {source.board_token}</p></div></div></td><td className="px-4 py-3 text-xs text-slate-600">{source.acquisition_policy}</td><td className="px-4 py-3"><select value={source.display_policy} onChange={(event) => setSources((items) => items.map((item) => item.id === source.id ? { ...item, display_policy: event.target.value } : item))} className="border border-slate-200 px-2 py-1.5 text-xs"><option value="full_text_authorized">授权全文</option><option value="excerpt">摘要</option><option value="metadata_only">仅元数据</option></select></td><td className="px-4 py-3 text-right tabular-nums">{source.job_count}</td><td className="px-4 py-3 text-xs text-slate-500">{source.last_fetched_at ?? '—'}<span className="mt-0.5 block">{source.last_run_status ?? ''}</span></td><td className="px-4 py-3 text-xs text-slate-500">{source.next_fetch_at ?? '—'}</td><td className={`px-4 py-3 text-right tabular-nums ${source.consecutive_failures ? 'text-red-600' : ''}`}>{source.consecutive_failures}</td><td className="px-4 py-3"><button onClick={() => void update(source, !source.enabled)} className={`relative h-5 w-9 rounded-full transition-colors ${source.enabled ? 'bg-teal-700' : 'bg-slate-300'}`} aria-label={source.enabled ? '停用来源' : '启用来源'}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${source.enabled ? 'left-[18px]' : 'left-0.5'}`} /></button></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><button disabled={busy === source.id} onClick={() => void update(source)} className="border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">保存</button><button disabled={busy === source.id || !source.enabled} onClick={() => void sync(source)} className="admin-primary-action inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"><Play className="h-3 w-3" />同步</button></div></td></tr>)}{!sources.length ? <tr><td colSpan={9} className="px-4 py-14 text-center text-slate-500">暂无职位来源</td></tr> : null}</tbody></table></div></section>
  </div>;
}
