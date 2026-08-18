import { ArrowLeft, FilePenLine, Plus, Send, Sparkles } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';
import { getAccountCopy } from '../../data/accountCopy';

type CreatorCourse = { id: string; title: string; summary: string; language: string; body_markdown: string; status: string; review_note: string | null; points_awarded: number; updated_at: string };

export function CreatorStudio({ createMode = false }: { createMode?: boolean }) {
  const { i18n } = useTranslation();
  const copy = getAccountCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CreatorCourse[]>([]);
  const [form, setForm] = useState({ title: '', summary: '', language: 'zh-CN', bodyMarkdown: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/creator/courses');
      const data = await response.json() as { courses?: CreatorCourse[]; error?: string };
      if (data.error) throw new Error(data.error);
      setCourses(data.courses ?? []);
    } catch {
      setMessage('Unable to load creator courses.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/creator/courses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Unable to create course');
      navigate('/me/creator');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create course'); } finally { setSaving(false); }
  }

  async function submit(courseId: string) {
    setSaving(true); setMessage('');
    try {
      const response = await fetch(`/api/creator/courses/${encodeURIComponent(courseId)}/submit`, { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Unable to submit course');
      load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to submit course'); } finally { setSaving(false); }
  }

  const label = (status: string) => status === 'submitted' ? copy.submitted : status === 'recommended' ? copy.recommended : status === 'changes_requested' ? copy.changesRequested : copy.draft;

  if (createMode) return <div className="mx-auto max-w-4xl space-y-8 pb-12">
    <div><Link to="/me/creator" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" />{copy.creator}</Link><h1 className="mt-4 font-h1 text-[32px] text-on-surface">{copy.creatorTitle}</h1><p className="mt-2 max-w-3xl text-on-surface-variant">{copy.creatorIntro}</p></div>
    {message && <p className="rounded-xl border border-primary/20 bg-primary-container/25 px-4 py-3 text-sm">{message}</p>}
    <form onSubmit={create} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8"><div className="flex items-center gap-2"><FilePenLine className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">{copy.createCourse}</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="text-sm font-medium">{copy.courseTitle}</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5" /></label><label><span className="text-sm font-medium">{copy.language}</span><select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5"><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select></label><label className="md:col-span-2"><span className="text-sm font-medium">{copy.courseSummary}</span><textarea required rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5" /></label><label className="md:col-span-2"><span className="text-sm font-medium">{copy.courseContent}</span><textarea rows={14} value={form.bodyMarkdown} onChange={(event) => setForm({ ...form, bodyMarkdown: event.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-mono text-sm" /></label></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link to="/me/creator" className="rounded-lg border border-outline-variant px-5 py-2.5 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low">{copy.cancel}</Link><button disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? copy.saving : copy.createCourse}</button></div></form>
  </div>;

  return <div className="mx-auto max-w-5xl space-y-8 pb-12">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">Study AI Now!</p><h1 className="mt-1 font-h1 text-[32px] text-on-surface">{copy.creator}</h1><p className="mt-2 max-w-3xl text-on-surface-variant">{copy.creatorIntro}</p></div><Link to="/me/creator/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary/90"><Plus className="h-4 w-4" />{copy.createCourse}</Link></div>
    {message && <p className="rounded-xl border border-primary/20 bg-primary-container/25 px-4 py-3 text-sm">{message}</p>}
    <section><div className="grid gap-4">{courses.map((course) => <article key={course.id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">{label(course.status)}</p><h2 className="mt-1 text-lg font-bold">{course.title}</h2><p className="mt-2 text-sm text-on-surface-variant">{course.summary}</p>{course.review_note && <p className="mt-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm">{course.review_note}</p>}</div>{course.status === 'draft' || course.status === 'changes_requested' ? <button type="button" onClick={() => submit(course.id)} disabled={saving || course.body_markdown.length < 300} className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"><Send className="h-4 w-4" />{copy.submitReview}</button> : course.status === 'recommended' ? <span className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-3 py-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" />+{course.points_awarded} {copy.points}</span> : null}</div></article>)}{!courses.length && <div className="rounded-2xl border border-dashed border-outline-variant px-6 py-14 text-center"><FilePenLine className="mx-auto h-9 w-9 text-outline" /><p className="mt-4 text-sm text-on-surface-variant">{copy.creatorIntro}</p><Link to="/me/creator/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"><Plus className="h-4 w-4" />{copy.createCourse}</Link></div>}</div></section>
  </div>;
}
