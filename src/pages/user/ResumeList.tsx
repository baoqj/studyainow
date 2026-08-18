import { FilePlus2, FileText, LoaderCircle, Trash2 } from 'lucide-react';
import { type MouseEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { AppLocale } from '../../data/courseContent';
import { getResumeCopy } from '../../data/resumeCopy';

type ResumeSummary = {
  id: string;
  name: string;
  status: 'draft' | 'completed';
  fullName: string;
  targetRole: string;
  createdAt: string;
  updatedAt: string;
};

function date(value: string, locale: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
}

export function ResumeList() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getResumeCopy(locale);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'create' | string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/resumes');
      const data = await response.json().catch(() => ({})) as { resumes?: ResumeSummary[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.messages.loadFailed);
      setResumes(Array.isArray(data.resumes) ? data.resumes.filter((resume): resume is ResumeSummary => Boolean(resume) && typeof resume.id === 'string' && typeof resume.name === 'string') : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.messages.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [copy.messages.loadFailed]);

  async function create() {
    setBusy('create'); setMessage('');
    try {
      const response = await fetch('/api/resumes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
      const data = await response.json().catch(() => ({})) as { resume?: ResumeSummary; error?: string };
      if (!response.ok || !data.resume?.id) throw new Error(data.error ?? copy.messages.saveFailed);
      navigate(`/me/resume/${encodeURIComponent(data.resume.id)}`, { state: { message: copy.messages.resumeCreated } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.messages.saveFailed);
    } finally {
      setBusy(null);
    }
  }

  async function remove(event: MouseEvent<HTMLButtonElement>, resume: ResumeSummary) {
    event.stopPropagation();
    if (!window.confirm(copy.list.confirmDelete)) return;
    setBusy(resume.id); setMessage('');
    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(resume.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.messages.deleteFailed);
      setResumes((current) => current.filter((item) => item.id !== resume.id));
      setMessage(copy.messages.resumeDeleted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.messages.deleteFailed);
    } finally {
      setBusy(null);
    }
  }

  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-6 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold text-primary">{copy.eyebrow}</p><h1 className="mt-1 font-h1 text-[32px] text-on-surface">{copy.list.title}</h1><p className="mt-2 max-w-3xl text-on-surface-variant">{copy.list.intro}</p></div>
      <button type="button" onClick={create} disabled={busy !== null} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"><FilePlus2 className="h-4 w-4" />{busy === 'create' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{copy.list.newResume}</button>
    </header>
    {message && <p className="rounded-xl border border-primary/25 bg-primary-container/20 px-4 py-3 text-sm text-on-surface" role="status">{message}</p>}
    {loading ? <div className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface-variant"><LoaderCircle className="h-5 w-5 animate-spin" />{copy.list.loading}</div> : resumes.length ? <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm"><div className="hidden grid-cols-[minmax(180px,1.5fr)_minmax(130px,1fr)_minmax(130px,1fr)_120px_120px_100px_40px] gap-4 border-b border-outline-variant bg-surface-container-low px-5 py-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant lg:grid"><span>{copy.list.name}</span><span>{copy.list.person}</span><span>{copy.list.role}</span><span>{copy.list.created}</span><span>{copy.list.updated}</span><span>{copy.list.status}</span><span className="sr-only">{copy.list.delete}</span></div><div className="divide-y divide-outline-variant">{resumes.map((resume) => <article key={resume.id} onClick={() => navigate(`/me/resume/${encodeURIComponent(resume.id)}`)} className="group cursor-pointer px-5 py-4 transition-colors hover:bg-primary-container/10"><div className="grid gap-3 lg:grid-cols-[minmax(180px,1.5fr)_minmax(130px,1fr)_minmax(130px,1fr)_120px_120px_100px_40px]"><div className="flex min-w-0 items-start gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="min-w-0 truncate font-semibold text-on-surface">{resume.name}</p></div><div><span className="mr-2 text-xs text-on-surface-variant lg:hidden">{copy.list.person}</span><span className="text-sm text-on-surface">{resume.fullName || '—'}</span></div><div><span className="mr-2 text-xs text-on-surface-variant lg:hidden">{copy.list.role}</span><span className="text-sm text-on-surface">{resume.targetRole || '—'}</span></div><div><span className="mr-2 text-xs text-on-surface-variant lg:hidden">{copy.list.created}</span><span className="text-sm text-on-surface-variant">{date(resume.createdAt, locale)}</span></div><div><span className="mr-2 text-xs text-on-surface-variant lg:hidden">{copy.list.updated}</span><span className="text-sm text-on-surface-variant">{date(resume.updatedAt, locale)}</span></div><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${resume.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-primary-container/30 text-primary'}`}>{resume.status === 'completed' ? copy.list.completed : copy.list.draft}</span></div><button type="button" onClick={(event) => remove(event, resume)} disabled={busy !== null} aria-label={copy.list.delete} title={copy.list.delete} className="justify-self-end rounded-lg p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div></article>)}</div></div> : <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"><FileText className="mx-auto h-8 w-8 text-primary" /><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-on-surface-variant">{copy.list.empty}</p><button type="button" onClick={create} disabled={busy !== null} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"><FilePlus2 className="h-4 w-4" />{copy.list.newResume}</button></section>}
  </div>;
}
