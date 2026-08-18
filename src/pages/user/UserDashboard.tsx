import { Award, BookOpen, BriefcaseBusiness, Clock, FilePenLine, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';
import { getAccountCopy } from '../../data/accountCopy';
import { fetchAccountOverview, type AccountOverview } from '../../lib/account';

export function UserDashboard() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getAccountCopy(locale);
  const [data, setData] = useState<AccountOverview | null>(null);
  useEffect(() => { fetchAccountOverview().then(setData).catch(() => setData(null)); }, []);
  if (!data) return <div className="py-12 text-center text-on-surface-variant">{copy.saving}</div>;
  const activeCourses = data.courses.filter((course) => course.average_progress < 100).length;
  const name = data.profile?.display_name || data.profile?.username || '—';
  return <div className="max-w-5xl mx-auto space-y-8 pb-12">
    <div><h1 className="font-h1 text-[32px] text-on-surface">{copy.dashboard}</h1><p className="mt-2 text-on-surface-variant">{name}</p></div>
    <div className="grid gap-4 sm:grid-cols-3">{[[BookOpen, copy.courses, activeCourses], [Sparkles, copy.points, data.points], [Award, copy.badges, data.badges.length]].map(([Icon, label, value]) => { const CardIcon = Icon as typeof BookOpen; return <div key={String(label)} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"><CardIcon className="h-5 w-5 text-primary" /><p className="mt-4 text-3xl font-black">{String(value)}</p><p className="mt-1 text-sm text-on-surface-variant">{String(label)}</p></div>; })}</div>
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{copy.courses}</h2><Link to="/me/course" className="text-sm font-semibold text-primary">{copy.courses}</Link></div><div className="mt-5 space-y-4">{data.courses.map((course) => <Link key={course.course_id} to={`/courses/${course.course_slug}`} className="block rounded-xl bg-surface-container-low p-4 hover:bg-primary-container/35"><div className="flex items-center justify-between gap-4"><div><p className="font-semibold">{course.course_title}</p><p className="mt-1 text-sm text-on-surface-variant">{course.completed_chapters}/{course.chapter_count}</p></div><span className="font-bold text-primary">{course.average_progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full bg-primary" style={{ width: `${course.average_progress}%` }} /></div></Link>)}{!data.courses.length && <p className="text-sm text-on-surface-variant">—</p>}</div></section>
    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"><h2 className="text-xl font-bold">{copy.badges}</h2><div className="mt-4 space-y-3">{data.badges.map((badge) => <div key={badge.slug} className="rounded-xl bg-surface-container-low p-3"><p className="font-semibold">{badge.name}</p><p className="mt-1 text-sm text-on-surface-variant">{badge.description}</p></div>)}{!data.badges.length && <p className="text-sm text-on-surface-variant">—</p>}</div></section><section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"><h2 className="text-xl font-bold">{copy.jobs}</h2><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{copy.resumeIntro}</p><Link to="/me/resume" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"><BriefcaseBusiness className="h-4 w-4" />{copy.resumes}</Link><Link to="/me/creator" className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary"><FilePenLine className="h-4 w-4" />{copy.creator} · {data.creator.recommended}</Link></section></div>
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">{copy.dashboard}</h2></div><div className="mt-4 space-y-3">{data.notifications.slice(0, 5).map((item) => <Link key={item.id} to={item.action_url || '/me'} className="block rounded-xl bg-surface-container-low p-3"><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-on-surface-variant">{item.body}</p></Link>)}{!data.notifications.length && <p className="text-sm text-on-surface-variant">—</p>}</div></section>
  </div>;
}
