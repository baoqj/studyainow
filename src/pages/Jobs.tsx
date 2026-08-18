import { BriefcaseBusiness, MapPin, Search } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { BookmarkButton } from '../components/jobs/BookmarkButton';
import { ReturnToCoursesPrompt } from '../components/jobs/ReturnToCoursesPrompt';
import { type AppLocale } from '../data/courseContent';
import { getJobsCopy, localSkillName } from '../data/jobsCopy';
import { fetchJobs, type JobListItem, type JobListResponse } from '../lib/jobs';
import { citySlugFor, isRegionOnlyLocation, localizeCity, localizeCountry } from '../../shared/jobLocations';
import { useTranslation } from 'react-i18next';

type JobFilterState = { query: string; country: string; city: string; remote: string };
const dateLocale: Record<AppLocale, string> = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', en: 'en-CA', fr: 'fr-CA', es: 'es-ES' };
const EUROPE_CODES = new Set(['AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA', 'XK']);
const COUNTRY_OPTION_CODES = ['CN', 'SG', 'TW', 'HK', 'US', 'CA', 'GB', 'EU', 'AU', 'AE'];
const COUNTRY_QUERY_ALIASES: Record<string, string> = {
  cn: 'CN', china: 'CN', '中国': 'CN', '中國': 'CN',
  sg: 'SG', singapore: 'SG',
  tw: 'TW', taiwan: 'TW', '台湾': 'TW', '台灣': 'TW', '臺灣': 'TW',
  hk: 'HK', 'hong-kong': 'HK', hongkong: 'HK', '香港': 'HK',
  us: 'US', usa: 'US', america: 'US', 'united-states': 'US', unitedstates: 'US',
  ca: 'CA', canada: 'CA',
  gb: 'GB', uk: 'GB', 'united-kingdom': 'GB', unitedkingdom: 'GB', britain: 'GB',
  eu: 'EU', europe: 'EU',
  au: 'AU', australia: 'AU',
  ae: 'AE', uae: 'AE', 'united-arab-emirates': 'AE', unitedarabemirates: 'AE',
  ch: 'CH', switzerland: 'CH', suisse: 'CH', suiza: 'CH', '瑞士': 'CH',
  de: 'DE', germany: 'DE', allemagne: 'DE', alemania: 'DE', '德国': 'DE', '德國': 'DE',
  fr: 'FR', france: 'FR', '法国': 'FR', '法國': 'FR',
  ie: 'IE', ireland: 'IE', irlande: 'IE', irlanda: 'IE', '爱尔兰': 'IE', '愛爾蘭': 'IE',
  in: 'IN', india: 'IN', inde: 'IN', '印度': 'IN',
  jp: 'JP', japan: 'JP', japon: 'JP', '日本': 'JP',
  kr: 'KR', 'south-korea': 'KR', southkorea: 'KR', korea: 'KR', '韩国': 'KR', '韓國': 'KR',
};
const COUNTRY_QUERY_VALUES: Record<string, string> = {
  CN: 'china', SG: 'singapore', TW: 'taiwan', HK: 'hong-kong', US: 'united-states',
  CA: 'canada', GB: 'united-kingdom', EU: 'europe', AU: 'australia', AE: 'united-arab-emirates',
  CH: 'switzerland', DE: 'germany', FR: 'france', IE: 'ireland', IN: 'india', JP: 'japan', KR: 'south-korea',
};

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(dateLocale[locale], { dateStyle: 'medium' }).format(date);
}

function jobLocationLabel(job: JobListItem, locale: AppLocale) {
  const geography = job.geography;
  const pieces = geography ? [
    isRegionOnlyLocation(geography.countryCode, geography.cityName) ? '' : localizeCity(geography.countryCode, geography.cityName, locale),
    localizeCountry(geography.countryCode, locale, geography.countryName ?? ''),
  ].filter(Boolean) : [];
  return pieces.length ? pieces.join(', ') : job.location;
}

function locationCount(code: string, data: JobListResponse | null) {
  if (!data) return 0;
  if (code === 'EU') return data.filters.countries.filter((item) => EUROPE_CODES.has(item.code)).reduce((total, item) => total + item.count, 0);
  return data.filters.countries.find((item) => item.code === code)?.count ?? 0;
}

function scopeValue(country: string, city = '') {
  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (city) params.set('city', city);
  return params.toString();
}

function queryToken(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function countryFromQuery(value: string | null) {
  const token = queryToken(value ?? '');
  if (COUNTRY_QUERY_ALIASES[token]) return COUNTRY_QUERY_ALIASES[token];
  return /^[a-z]{2}$/.test(token) ? token.toUpperCase() : '';
}

function cityFromQuery(country: string, value: string | null) {
  const raw = (value ?? '').trim().slice(0, 100);
  if (!raw) return '';
  return citySlugFor(country, raw);
}

function filtersFromSearchParams(searchParams: URLSearchParams): JobFilterState {
  const rawKeyword = searchParams.get('kw') ?? searchParams.get('q') ?? '';
  const remote = searchParams.get('remote') ?? '';
  const country = countryFromQuery(searchParams.get('country'));
  return {
    query: rawKeyword.trim().replace(/\s+/g, ' ').slice(0, 120),
    country,
    city: cityFromQuery(country, searchParams.get('city')),
    remote: ['remote', 'hybrid', 'on_site', 'unknown'].includes(remote) ? remote : '',
  };
}

function searchParamsFromFilters(filters: JobFilterState) {
  const params = new URLSearchParams();
  if (filters.country) params.set('country', COUNTRY_QUERY_VALUES[filters.country] ?? filters.country.toLowerCase());
  if (filters.city) params.set('city', filters.city);
  if (filters.query) params.set('kw', filters.query);
  if (filters.remote) params.set('remote', filters.remote);
  return params;
}

function countryOptions(data: JobListResponse | null, locale: AppLocale) {
  const presentCodes = data?.filters.locations.map((location) => location.code) ?? [];
  const additionalCodes = presentCodes
    .filter((code) => !COUNTRY_OPTION_CODES.includes(code))
    .sort((left, right) => localizeCountry(left, locale).localeCompare(localizeCountry(right, locale)));
  return [...COUNTRY_OPTION_CODES, ...additionalCodes];
}

export function Jobs() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getJobsCopy(locale);
  const routeFilters = filtersFromSearchParams(searchParams);
  const [data, setData] = useState<JobListResponse | null>(null);
  const [query, setQuery] = useState(routeFilters.query);
  const [submittedQuery, setSubmittedQuery] = useState(routeFilters.query);
  const [country, setCountry] = useState(routeFilters.country);
  const [city, setCity] = useState(routeFilters.city);
  const [remote, setRemote] = useState(routeFilters.remote);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const [isCourseReturnPromptOpen, setIsCourseReturnPromptOpen] = useState(false);

  useEffect(() => {
    setQuery(routeFilters.query);
    setSubmittedQuery(routeFilters.query);
    setCountry(routeFilters.country);
    setCity(routeFilters.city);
    setRemote(routeFilters.remote);
  }, [searchParams]);

  function applyFilters(next: JobFilterState) {
    setQuery(next.query);
    setSubmittedQuery(next.query);
    setCountry(next.country);
    setCity(next.city);
    setRemote(next.remote);
    const nextSearchParams = searchParamsFromFilters(next);
    if (nextSearchParams.toString() !== searchParams.toString()) setSearchParams(nextSearchParams);
  }

  function jobParams(offset = 0) {
    const params = new URLSearchParams();
    // Keep the visible page size explicit as well as using the API default.
    // This protects the catalogue from an accidental pagination-default change.
    params.set('limit', '24');
    if (offset) params.set('offset', String(offset));
    if (submittedQuery) params.set('q', submittedQuery);
    if (country) params.set('country', country);
    if (city) params.set('city', city);
    if (remote) params.set('remote', remote);
    return params;
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadingMore(false);
    setMoreError('');
    setError('');
    fetchJobs(jobParams().toString())
      .then((result) => active && setData(result))
      .catch(() => active && setError(copy.loadError))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [city, copy.loadError, country, remote, submittedQuery]);

  function submit(event: FormEvent) {
    event.preventDefault();
    applyFilters({ query: query.trim().replace(/\s+/g, ' '), country, city, remote });
  }

  function filterByCompany(companyName: string) {
    // The jobs endpoint searches company names with a partial, case-insensitive
    // match. Reset other scopes so this button always reveals the company's
    // complete current catalogue rather than only the current location slice.
    applyFilters({ query: companyName, country: '', city: '', remote: '' });
  }

  function updateBookmark(slug: string, bookmarked: boolean) {
    setData((current) => current ? {
      ...current,
      jobs: current.jobs.map((job) => job.slug === slug ? { ...job, bookmarked } : job),
    } : current);
  }

  async function loadMore() {
    const nextOffset = data?.pagination.nextOffset;
    if (nextOffset === null || nextOffset === undefined || loadingMore) return;

    setLoadingMore(true);
    setMoreError('');
    try {
      const nextPage = await fetchJobs(jobParams(nextOffset).toString());
      setData((current) => current ? {
        ...nextPage,
        jobs: [...current.jobs, ...nextPage.jobs],
      } : nextPage);
    } catch {
      setMoreError(copy.loadError);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <Navbar onBrandClick={() => setIsCourseReturnPromptOpen(true)} brandClickLabel={copy.returnToCoursesTitle} />
      <ReturnToCoursesPrompt open={isCourseReturnPromptOpen} title={copy.returnToCoursesTitle} body={copy.returnToCoursesBody} confirmLabel={copy.confirm} cancelLabel={copy.cancel} onConfirm={() => navigate('/')} onCancel={() => setIsCourseReturnPromptOpen(false)} />
      <main className="flex-grow pt-16">
        <section className="border-b border-outline-variant bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-5 py-5 sm:px-8 sm:py-7">
            <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-sm md:grid-cols-2 xl:grid-cols-[290px_minmax(0,1fr)_180px_auto]">
              <label className="rounded-xl border border-outline-variant px-3 py-2 text-sm text-on-surface-variant">
                <span className="sr-only">{copy.location}</span>
                <select value={scopeValue(country, city)} onChange={(event) => {
                  const scope = new URLSearchParams(event.target.value);
                  applyFilters({
                    query: submittedQuery,
                    country: scope.get('country') ?? '',
                    city: scope.get('city') ?? '',
                    remote,
                  });
                }} className="w-full bg-transparent px-1 py-1.5 outline-none text-on-surface">
                  <option value="">{copy.allCountries}</option>
                  {countryOptions(data, locale).map((code) => {
                    const count = locationCount(code, data);
                    const hierarchy = data?.filters.locations.find((entry) => entry.code === code);
                    const label = localizeCountry(code, locale);
                    return <optgroup key={code} label={`${label}${count ? ` (${count})` : ''}`}>
                      <option value={scopeValue(code)}>{label}{count ? ` — ${count}` : ''}</option>
                      {(hierarchy?.cities ?? []).map((entry) => <option key={`${code}-city-${entry.slug}`} value={scopeValue(code, entry.slug)}>└ {localizeCity(code, entry.slug, locale)} ({entry.count})</option>)}
                    </optgroup>;
                  })}
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 focus-within:ring-2 focus-within:ring-primary">
                <Search className="h-5 w-5 shrink-0 text-outline" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none text-on-surface placeholder:text-outline" placeholder={copy.search} />
              </label>
              <label className="rounded-xl border border-outline-variant px-3 py-2 text-sm text-on-surface-variant">
                <span className="sr-only">{copy.remote}</span>
                <select value={remote} onChange={(event) => applyFilters({ query: submittedQuery, country, city, remote: event.target.value })} className="w-full bg-transparent px-1 py-1.5 outline-none text-on-surface">
                  <option value="">{copy.allWorkplaces}</option>
                  <option value="remote">{copy.remoteOnly}</option>
                  <option value="hybrid">{copy.hybrid}</option>
                  <option value="on_site">{copy.onsite}</option>
                </select>
              </label>
              <button type="submit" className="rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary transition hover:bg-primary/90">{copy.searchAction}</button>
            </form>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1920px] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant">{copy.loading}</div>
          ) : error ? (
            <div className="mt-6 rounded-xl border border-error/30 bg-error-container/30 px-5 py-8 text-center">
              <p>{error}</p><button onClick={() => setSubmittedQuery((current) => current)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{copy.retry}</button>
            </div>
          ) : data?.jobs.length ? (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {data.jobs.map((job) => (
                  <article key={job.slug} className="group flex min-h-56 flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => filterByCompany(job.company.name)}
                        className="rounded-lg border border-primary bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {job.company.name}
                      </button>
                      <div className="flex items-center gap-2"><span className="text-xs text-on-surface-variant">{formatDate(job.publishedAt, locale)}</span><BookmarkButton jobSlug={job.slug} bookmarked={job.bookmarked} saveLabel={copy.saveJob} removeLabel={copy.removeSavedJob} onChange={(bookmarked) => updateBookmark(job.slug, bookmarked)} /></div>
                    </div>
                    <Link to={`/jobs/${job.slug}`} className="mt-4 block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      <h3 className="text-xl font-bold leading-snug text-on-surface group-hover:text-primary">{job.title}</h3>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                        {jobLocationLabel(job, locale) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{jobLocationLabel(job, locale)}</span>}
                        <span>{job.remoteType === 'remote' ? copy.remoteOnly : job.remoteType === 'hybrid' ? copy.hybrid : job.remoteType === 'on_site' ? copy.onsite : copy.allWorkplaces}</span>
                      </div>
                    </Link>
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant pt-4 text-sm">
                      <span className="font-medium text-primary">{job.skillCount} {copy.skills}</span>
                      {job.primarySkill && <span className="truncate text-on-surface-variant">{localSkillName(job.primarySkill, locale)}</span>}
                    </div>
                  </article>
                ))}
              </div>
              {data.pagination.nextOffset !== null && (
                <div className="mt-8 text-center">
                  {moreError && <p className="mb-3 text-sm text-error">{moreError}</p>}
                  <button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-xl border border-primary bg-surface-container-lowest px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-on-primary disabled:cursor-wait disabled:opacity-60">
                    {loadingMore ? copy.loading : copy.loadMore}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
              <BriefcaseBusiness className="mx-auto h-9 w-9 text-outline" />
              <h3 className="mt-4 text-xl font-bold">{copy.noJobs}</h3>
              <p className="mx-auto mt-3 max-w-xl leading-relaxed text-on-surface-variant">{copy.noJobsBody}</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
