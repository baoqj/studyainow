import { Bookmark, BriefcaseBusiness, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookmarkButton } from '../../components/jobs/BookmarkButton';
import { type AppLocale } from '../../data/courseContent';
import { getJobsCopy, localSkillName } from '../../data/jobsCopy';
import { fetchBookmarkedJobs, type JobListItem } from '../../lib/jobs';
import { isRegionOnlyLocation, localizeCity, localizeCountry } from '../../../shared/jobLocations';

const dateLocale: Record<AppLocale, string> = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', en: 'en-CA', fr: 'fr-CA', es: 'es-ES' };

function locationLabel(job: JobListItem, locale: AppLocale) {
  const geography = job.geography;
  if (!geography) return job.location;
  const parts = [
    isRegionOnlyLocation(geography.countryCode, geography.cityName) ? '' : localizeCity(geography.countryCode, geography.cityName, locale),
    localizeCountry(geography.countryCode, locale, geography.countryName ?? ''),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : job.location;
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(dateLocale[locale], { dateStyle: 'medium' }).format(date);
}

export function MyJobs() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getJobsCopy(locale);
  const [jobs, setJobs] = useState<JobListItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchBookmarkedJobs().then((result) => active && setJobs(result.jobs)).catch(() => active && setError(copy.loadError));
    return () => { active = false; };
  }, [copy.loadError]);

  if (jobs === null && !error) return <div className="py-12 text-center text-on-surface-variant">{copy.loading}</div>;

  return <div className="mx-auto max-w-5xl space-y-8 pb-12">
    <div><p className="text-sm font-semibold text-primary">Study AI Now!</p><h1 className="mt-1 font-h1 text-[32px] text-on-surface">{copy.myJobs}</h1><p className="mt-2 max-w-2xl text-on-surface-variant">{copy.myJobsIntro}</p></div>
    {error ? <div className="rounded-2xl border border-error/30 bg-error-container/20 p-6 text-center"><p className="text-on-surface">{error}</p><button type="button" onClick={() => { setError(''); setJobs(null); fetchBookmarkedJobs().then((result) => setJobs(result.jobs)).catch(() => setError(copy.loadError)); }} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{copy.retry}</button></div> : jobs?.length ? <div className="grid gap-4 md:grid-cols-2">
      {jobs.map((job) => <article key={job.slug} className="group flex min-h-56 flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
        <div className="flex items-start justify-between gap-4"><span className="rounded-lg border border-primary bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary">{job.company.name}</span><BookmarkButton jobSlug={job.slug} bookmarked saveLabel={copy.saveJob} removeLabel={copy.removeSavedJob} onChange={(bookmarked) => !bookmarked && setJobs((current) => current?.filter((item) => item.slug !== job.slug) ?? current)} /></div>
        <Link to={`/jobs/${job.slug}`} className="mt-4 block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><h2 className="text-xl font-bold leading-snug text-on-surface group-hover:text-primary">{job.title}</h2><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-on-surface-variant">{locationLabel(job, locale) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{locationLabel(job, locale)}</span>}<span>{job.remoteType === 'remote' ? copy.remoteOnly : job.remoteType === 'hybrid' ? copy.hybrid : job.remoteType === 'on_site' ? copy.onsite : copy.allWorkplaces}</span></div></Link>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant pt-4 text-sm"><span className="font-medium text-primary">{job.skillCount} {copy.skills}</span><span className="truncate text-on-surface-variant">{job.primarySkill ? localSkillName(job.primarySkill, locale) : formatDate(job.publishedAt, locale)}</span></div>
      </article>)}
    </div> : <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"><Bookmark className="mx-auto h-9 w-9 text-outline" /><h2 className="mt-4 text-xl font-bold text-on-surface">{copy.noSavedJobs}</h2><Link to="/jobs" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"><BriefcaseBusiness className="h-4 w-4" />{copy.backToJobs}</Link></div>}
  </div>;
}
