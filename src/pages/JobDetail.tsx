import { ArrowLeft, ArrowUpRight, BookOpen, BriefcaseBusiness, Building2, ChevronDown, ChevronUp, MapPin, Sparkles, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { BookmarkButton } from '../components/jobs/BookmarkButton';
import { ReturnToCoursesPrompt } from '../components/jobs/ReturnToCoursesPrompt';
import type { AppLocale } from '../data/courseCatalog';
import { getCourseSeoCopy } from '../data/courseSeo';
import { getJobsCopy, localSkillName } from '../data/jobsCopy';
import { fetchJob, fetchJobs, visibleJobSignals, type JobDetail as JobDetailData, type JobListItem, type JobRichTextInline } from '../lib/jobs';
import { isRegionOnlyLocation, localizeCity, localizeCountry } from '../../shared/jobLocations';
import { localizedPublicPath } from '../lib/localeRoutes';

const dateLocale: Record<AppLocale, string> = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', en: 'en-CA', fr: 'fr-CA', es: 'es-ES' };

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(dateLocale[locale], { dateStyle: 'medium' }).format(date);
}

function detailedLocationLabel(job: JobDetailData['job'], locale: AppLocale) {
  const labels = job.locations
    .map((location) => [
      isRegionOnlyLocation(location.countryCode, location.cityName) ? '' : localizeCity(location.countryCode, location.cityName, locale),
      localizeCountry(location.countryCode, locale, location.countryName ?? ''),
    ].filter(Boolean).join(', ') || location.rawText)
    .filter(Boolean);
  return labels.length ? [...new Set(labels)].join(' · ') : job.location;
}

function companyJobsPath(companyName: string) {
  const params = new URLSearchParams({ kw: companyName });
  return `/jobs?${params.toString()}`;
}

const panelLabels: Record<AppLocale, { company: string; lesson: string; courses: string; expandCourses: string; collapseCourses: string }> = {
  'zh-CN': { company: '公司职位', lesson: '第 {chapter} 章 · 第 {lesson} 节', courses: '课程目录', expandCourses: '展开课程目录', collapseCourses: '收起课程目录' },
  'zh-TW': { company: '公司職缺', lesson: '第 {chapter} 章 · 第 {lesson} 課', courses: '課程目錄', expandCourses: '展開課程目錄', collapseCourses: '收起課程目錄' },
  en: { company: 'Company roles', lesson: 'Lesson {chapter}.{lesson}', courses: 'Course lessons', expandCourses: 'Expand course lessons', collapseCourses: 'Collapse course lessons' },
  fr: { company: 'Postes de l’entreprise', lesson: 'Leçon {chapter}.{lesson}', courses: 'Leçons du cours', expandCourses: 'Développer les leçons', collapseCourses: 'Réduire les leçons' },
  es: { company: 'Puestos de la empresa', lesson: 'Lección {chapter}.{lesson}', courses: 'Lecciones del curso', expandCourses: 'Expandir las lecciones', collapseCourses: 'Contraer las lecciones' },
};

const mobileSkillPanelLabels: Record<AppLocale, { close: string }> = {
  'zh-CN': { close: '关闭技能面板' },
  'zh-TW': { close: '關閉技能面板' },
  en: { close: 'Close skill panel' },
  fr: { close: 'Fermer le panneau de compétences' },
  es: { close: 'Cerrar el panel de habilidades' },
};

const localizedSkillCategories: Record<string, Partial<Record<AppLocale, string>>> = {
  'AI 入门': { 'zh-TW': 'AI 入門', en: 'AI foundations', fr: 'Fondamentaux de l’IA', es: 'Fundamentos de IA' },
  'AI 可靠性': { 'zh-TW': 'AI 可靠性', en: 'AI reliability', fr: 'Fiabilité de l’IA', es: 'Fiabilidad de IA' },
  'AI 安全': { 'zh-TW': 'AI 安全', en: 'AI safety', fr: 'Sécurité de l’IA', es: 'Seguridad de IA' },
  'AI 工程管理': { 'zh-TW': 'AI 工程管理', en: 'AI engineering management', fr: 'Gestion de l’ingénierie IA', es: 'Gestión de ingeniería de IA' },
  'Agent 工程': { 'zh-TW': 'Agent 工程', en: 'Agent engineering', fr: 'Ingénierie des agents', es: 'Ingeniería de agentes' },
  'Prompt 与上下文': { 'zh-TW': 'Prompt 與上下文', en: 'Prompting and context', fr: 'Prompts et contexte', es: 'Prompts y contexto' },
  '大模型基础': { 'zh-TW': '大型語言模型基礎', en: 'LLM foundations', fr: 'Fondamentaux des LLM', es: 'Fundamentos de los LLM' },
  '生成式媒体': { 'zh-TW': '生成式媒體', en: 'Generative media', fr: 'Médias génératifs', es: 'Medios generativos' },
};

function containsHan(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function localizedSkillCategory(category: string, locale: AppLocale) {
  const translated = localizedSkillCategories[category]?.[locale];
  if (translated) return translated;
  if (!locale.startsWith('zh') && containsHan(category)) {
    return { en: 'AI skill category', fr: 'Catégorie de compétence IA', es: 'Categoría de habilidad de IA' }[locale] ?? 'AI skill category';
  }
  return category;
}

function safeAnnotations(section: JobDetailData['sections'][number]) {
  const annotations = [...section.annotations]
    .filter((item) => item.start >= 0 && item.end <= section.text.length && item.end > item.start)
    // Never apply a stale offset to an unrelated visible phrase. The server
    // supplies the canonical evidence text, so an exact comparison is a cheap
    // last-line guard for data created by an older renderer.
    .filter((item) => section.text.slice(item.start, item.end) === item.phrase)
    .sort((left, right) => left.start - right.start || right.end - left.end);
  return annotations.filter((item, index) => index === 0 || item.start >= annotations[index - 1].end);
}

function annotationClass(active: boolean) {
  return `cursor-pointer rounded-sm border px-0.5 font-semibold text-primary underline decoration-[3px] underline-offset-4 transition focus:outline-none focus:ring-2 focus:ring-primary ${active ? 'border-primary decoration-primary ring-1 ring-primary/30' : 'border-primary/45 decoration-primary/70 hover:border-primary hover:decoration-primary'}`;
}

function renderAnnotatedText(
  value: string,
  cursor: { value: number },
  annotations: ReturnType<typeof safeAnnotations>,
  activeSkill: string | null,
  onSelect: (skillId: string) => void,
  keyPrefix: string,
) {
  const start = cursor.value;
  const end = start + value.length;
  cursor.value = end;
  const relevant = annotations.filter((item) => item.start < end && item.end > start);
  if (!relevant.length) return value;
  let pointer = start;
  const nodes: ReactElement[] = [];
  for (const item of relevant) {
    const rangeStart = Math.max(pointer, item.start, start);
    const rangeEnd = Math.min(end, item.end);
    if (rangeStart > pointer) nodes.push(<Fragment key={`${keyPrefix}-${pointer}`}>{value.slice(pointer - start, rangeStart - start)}</Fragment>);
    if (rangeEnd > rangeStart) {
      // A span (rather than a nested button) keeps marked skills valid even
      // when an ATS link contains a skill phrase. No source HTML is rendered.
      nodes.push(<span key={`${keyPrefix}-${item.id}-${rangeStart}`} role="button" tabIndex={0} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSelect(item.skillId); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect(item.skillId); } }} className={annotationClass(activeSkill === item.skillId)} aria-label={item.phrase}>
        {value.slice(rangeStart - start, rangeEnd - start)}
      </span>);
    }
    pointer = Math.max(pointer, rangeEnd);
  }
  if (pointer < end) nodes.push(<Fragment key={`${keyPrefix}-tail`}>{value.slice(pointer - start)}</Fragment>);
  return nodes;
}

function renderRichInlines(
  inlines: JobRichTextInline[],
  cursor: { value: number },
  annotations: ReturnType<typeof safeAnnotations>,
  activeSkill: string | null,
  onSelect: (skillId: string) => void,
  keyPrefix: string,
): ReactNode {
  return inlines.map((inline, index) => {
    const key = `${keyPrefix}-${index}`;
    if (inline.type === 'text') return <Fragment key={key}>{renderAnnotatedText(inline.text, cursor, annotations, activeSkill, onSelect, key)}</Fragment>;
    const children = renderRichInlines(inline.children, cursor, annotations, activeSkill, onSelect, key);
    if (inline.type === 'bold') return <strong key={key} className="font-bold">{children}</strong>;
    // The API has already validated this allowlisted URL. Keep the defensive
    // check here as an additional boundary for malformed stored records.
    return inline.href.startsWith('https://')
      ? <a key={key} href={inline.href} target="_blank" rel="noreferrer" className="font-medium text-primary underline decoration-primary/60 underline-offset-2 hover:text-primary/80">{children}</a>
      : <Fragment key={key}>{children}</Fragment>;
  });
}

function richSectionContent(section: JobDetailData['sections'][number], activeSkill: string | null, onSelect: (skillId: string) => void) {
  if (!section.richContent?.blocks.length) {
    const cursor = { value: 0 };
    return <p className="mt-3 whitespace-pre-wrap leading-8 text-[15px] text-on-surface">{renderAnnotatedText(section.text, cursor, safeAnnotations(section), activeSkill, onSelect, 'legacy')}</p>;
  }
  const annotations = safeAnnotations(section);
  const cursor = { value: 0 };
  return <div className="mt-3 space-y-4 text-[15px] leading-8 text-on-surface">
    {section.richContent.blocks.map((block, index) => {
      const key = `${section.id}-${index}`;
      let content: ReactNode;
      if (block.type === 'list') {
        const List = block.ordered ? 'ol' : 'ul';
        content = <List key={key} className={block.ordered ? 'list-decimal space-y-2 pl-6 marker:font-semibold' : 'list-disc space-y-2 pl-6 marker:font-semibold'}>
          {block.items.map((item, itemIndex) => {
            // jobRichTextToPlainText joins list items with one `\n`. The DOM
            // has no text-node newline between <li> siblings, so advance the
            // canonical cursor explicitly before every item after the first.
            if (itemIndex > 0) cursor.value += 1;
            cursor.value += (block.ordered ? `${itemIndex + 1}. ` : '• ').length;
            return <li key={`${key}-${itemIndex}`}>{renderRichInlines(item, cursor, annotations, activeSkill, onSelect, `${key}-${itemIndex}`)}</li>;
          })}
        </List>;
      } else {
        const Heading = block.type === 'heading' ? `h${block.level}` as 'h2' | 'h3' | 'h4' : 'p';
        content = <Heading key={key} className={block.type === 'heading' ? (block.level === 2 ? 'pt-2 text-xl font-black leading-snug' : 'pt-1 text-lg font-bold leading-snug') : 'leading-8'}>
          {renderRichInlines(block.children, cursor, annotations, activeSkill, onSelect, key)}
        </Heading>;
      }
      if (index < section.richContent!.blocks.length - 1) cursor.value += 2; // canonical \n\n block separator
      return <Fragment key={`${key}-wrapper`}>{content}</Fragment>;
    })}
  </div>;
}

function coursePath(courseId: string, chapterRouteId: string, lessonRouteId: string | null, locale: AppLocale) {
  const path = lessonRouteId
    ? localizedPublicPath(`/courses/${courseId}/chapters/${chapterRouteId}/lessons/${lessonRouteId}`, locale)
    : localizedPublicPath(`/courses/${courseId}/chapters/${chapterRouteId}`, locale);
  const courseTitle = getCourseSeoCopy(courseId, locale)?.title ?? courseId.replace(/-/g, ' ');
  const chapterNumber = Number.parseInt(chapterRouteId, 10);
  const lessonNumber = Number.parseInt(lessonRouteId?.match(/(\d+)$/)?.[1] ?? '', 10);
  const lessonFallback = panelLabels[locale].lesson
    .replace('{chapter}', Number.isFinite(chapterNumber) ? String(chapterNumber) : chapterRouteId)
    .replace('{lesson}', Number.isFinite(lessonNumber) ? String(lessonNumber) : lessonRouteId ?? '');
  return { path, label: lessonFallback, courseTitle };
}

function MobileSkillDrawer({ open, onClose, locale, children }: { open: boolean; onClose: () => void; locale: AppLocale; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  return <div className={`fixed inset-0 z-[60] lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open} inert={!open}>
    <button
      type="button"
      aria-label={mobileSkillPanelLabels[locale].close}
      tabIndex={open ? 0 : -1}
      onClick={onClose}
      className={`absolute inset-0 bg-[#071a33]/35 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
    />
    <aside
      id="mobile-skill-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-skill-panel-title"
      className={`absolute inset-y-0 right-0 flex w-[min(23rem,calc(100vw-3.75rem))] flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {children}
    </aside>
  </div>;
}

function MobileSkillContent({
  skill,
  jobSlug,
  locale,
  copy,
  onClose,
}: {
  skill: JobDetailData['skills'][number] | null;
  jobSlug: string;
  locale: AppLocale;
  copy: ReturnType<typeof getJobsCopy>;
  onClose: () => void;
}) {
  return <>
    <header className="shrink-0 border-b border-outline-variant bg-surface-container-lowest px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5 shrink-0" /><h2 id="mobile-skill-panel-title" className="font-bold">{copy.skillsInJd}</h2></div>
          {skill && <p className="mt-3 break-words text-lg font-black leading-snug text-on-surface">{localSkillName(skill.name, locale)}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label={mobileSkillPanelLabels[locale].close} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-5 w-5" /></button>
      </div>
      {skill && <p className="mt-2 text-xs font-medium text-primary">{localizedSkillCategory(skill.category, locale)} · {skill.evidenceCount} {copy.evidence}</p>}
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]">
      {!skill ? <p className="text-sm text-on-surface-variant">{copy.noDescription}</p> : <div className="space-y-6">
        {skill.evidence.length > 0 && <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">{copy.relatedContent}</h3>
          <div className="mt-3 space-y-2">
            {skill.evidence.slice(0, 6).map((evidence) => <p key={evidence.id} className="border-l-2 border-primary/50 bg-surface-container-low px-3 py-2 text-sm leading-relaxed text-on-surface">{evidence.phrase}</p>)}
          </div>
        </section>}
        {(skill.relationships ?? []).length > 0 && <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">{copy.relatedSkills}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(skill.relationships ?? []).slice(0, 8).map((relationship) => <span key={`${relationship.skillId}-${relationship.relationType}`} className="rounded-full border border-primary/35 px-2.5 py-1 text-xs font-medium text-primary">{localSkillName(relationship.name, locale)}</span>)}
          </div>
        </section>}
        <section className="border-t border-outline-variant pt-5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">{panelLabels[locale].courses}</h3><span className="text-xs font-semibold text-primary">{skill.courses.length}</span></div>
          <div className="mt-3 divide-y divide-outline-variant border-y border-outline-variant">
            {skill.courses.length ? skill.courses.map((coverage) => {
              const destination = coursePath(coverage.courseId, coverage.chapterRouteId, coverage.lessonRouteId, locale);
              const params = new URLSearchParams({ job: jobSlug, skill: skill.slug, source: 'jd_map' });
              return <Link key={`${coverage.courseId}-${coverage.lessonRouteId ?? coverage.chapterRouteId}`} to={`${destination.path}?${params.toString()}`} className="group block py-3 text-sm transition hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <div className="flex gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-xs font-medium text-primary">{destination.courseTitle} · {copy.coverage[coverage.coverageLevel] ?? coverage.coverageLevel}</p><p className="mt-0.5 font-semibold leading-snug text-on-surface group-hover:text-primary">{destination.label}</p></div></div>
              </Link>;
            }) : <p className="py-3 text-sm text-on-surface-variant">{copy.noCourse}</p>}
          </div>
        </section>
      </div>}
    </div>
  </>;
}

export function JobDetail() {
  const { jobSlug } = useParams<{ jobSlug: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getJobsCopy(locale);
  const [data, setData] = useState<JobDetailData | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<JobListItem[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [isMobileSkillPanelOpen, setIsMobileSkillPanelOpen] = useState(false);
  const [isCourseReturnPromptOpen, setIsCourseReturnPromptOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobSlug) return;
    let active = true;
    setLoading(true); setError(''); setData(null); setActiveSkill(null); setExpandedSkill(null); setIsMobileSkillPanelOpen(false);
    setRelatedJobs([]);

    async function load() {
      try {
        const job = await fetchJob(jobSlug);
        if (!active) return;
        setData(job);
        setActiveSkill(job.skills[0]?.id ?? null);

        // This is intentionally an exact company lookup. The panel must be a
        // coherent company catalogue, rather than the arbitrary recent-job
        // sample that used to appear beside a JD.
        try {
          const query = new URLSearchParams({ company: job.job.company.slug, limit: '500' });
          const listing = await fetchJobs(query.toString());
          if (active) setRelatedJobs(listing.jobs);
        } catch {
          // A secondary-panel failure should never make the job itself
          // unreadable. The panel shows its localized empty state instead.
          if (active) setRelatedJobs([]);
        }
      } catch {
        if (active) setError(copy.loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [copy.loadError, jobSlug]);

  useEffect(() => {
    if (!activeSkill) return;
    if (window.matchMedia('(min-width: 1024px)').matches === false) return;
    document.getElementById(`skill-${activeSkill}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeSkill]);

  const activeSkillData = useMemo(() => data?.skills.find((skill) => skill.id === activeSkill) ?? null, [activeSkill, data]);
  const semanticSignals = useMemo(() => visibleJobSignals(data?.job.tags ?? []), [data?.job.tags]);

  function updateBookmark(bookmarked: boolean) {
    setData((current) => current ? { ...current, job: { ...current.job, bookmarked } } : current);
    if (jobSlug) {
      setRelatedJobs((current) => current.map((job) => job.slug === jobSlug ? { ...job, bookmarked } : job));
    }
  }

  function updateRelatedBookmark(slug: string, bookmarked: boolean) {
    setRelatedJobs((current) => current.map((job) => job.slug === slug ? { ...job, bookmarked } : job));
    if (slug === data?.job.slug) {
      setData((current) => current ? { ...current, job: { ...current.job, bookmarked } } : current);
    }
  }

  function selectSkill(skillId: string) {
    setActiveSkill(skillId);
    // A highlighted phrase is an explicit request to see how that exact skill
    // maps to lessons. Keeping a single expanded id makes every other course
    // directory collapse immediately.
    setExpandedSkill(skillId);
    if (window.matchMedia('(max-width: 1023px)').matches) setIsMobileSkillPanelOpen(true);
  }

  function toggleCourses(skillId: string) {
    setActiveSkill(skillId);
    setExpandedSkill((current) => current === skillId ? null : skillId);
  }

  if (loading) return <div className="min-h-screen bg-background"><Navbar onBrandClick={() => setIsCourseReturnPromptOpen(true)} brandClickLabel={copy.returnToCoursesTitle} /><ReturnToCoursesPrompt open={isCourseReturnPromptOpen} title={copy.returnToCoursesTitle} body={copy.returnToCoursesBody} confirmLabel={copy.confirm} cancelLabel={copy.cancel} onConfirm={() => navigate('/')} onCancel={() => setIsCourseReturnPromptOpen(false)} /><main className="pt-32 text-center text-on-surface-variant">{copy.loading}</main></div>;
  if (error || !data) return <div className="min-h-screen bg-background"><Navbar onBrandClick={() => setIsCourseReturnPromptOpen(true)} brandClickLabel={copy.returnToCoursesTitle} /><ReturnToCoursesPrompt open={isCourseReturnPromptOpen} title={copy.returnToCoursesTitle} body={copy.returnToCoursesBody} confirmLabel={copy.confirm} cancelLabel={copy.cancel} onConfirm={() => navigate('/')} onCancel={() => setIsCourseReturnPromptOpen(false)} /><main className="pt-32 text-center"><p className="text-on-surface-variant">{error || copy.loadError}</p><Link to="/jobs" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-on-primary">{copy.backToJobs}</Link></main></div>;

  const descriptionBadge = data.job.displayPolicy === 'excerpt'
    ? copy.sourceExcerptText
    : data.job.displayPolicy === 'metadata_only'
      ? copy.metadataOnlyText
      : copy.originalSourceText;
  const sourcePolicyNotice = data.job.displayPolicy === 'excerpt'
    ? copy.sourceExcerptNotice
    : data.job.displayPolicy === 'metadata_only'
      ? copy.metadataOnlyNotice
      : copy.sourceNotice;

  return (
    <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface lg:h-dvh lg:overflow-hidden">
      <Navbar onBrandClick={() => setIsCourseReturnPromptOpen(true)} brandClickLabel={copy.returnToCoursesTitle} />
      <ReturnToCoursesPrompt open={isCourseReturnPromptOpen} title={copy.returnToCoursesTitle} body={copy.returnToCoursesBody} confirmLabel={copy.confirm} cancelLabel={copy.cancel} onConfirm={() => navigate('/')} onCancel={() => setIsCourseReturnPromptOpen(false)} />
      <main className="flex flex-1 flex-col pt-16 lg:min-h-0">
        <header className="shrink-0 border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-3 py-3 sm:px-5">
            <Link to="/jobs" className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" />{copy.backToJobs}</Link>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-5 px-3 py-5 sm:px-5 sm:py-6 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <div className="flex flex-col gap-5 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)_320px] lg:gap-5 xl:grid-cols-[400px_minmax(0,1fr)_360px]">
          <aside className="hidden lg:block lg:min-h-0">
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="shrink-0 border-b border-outline-variant px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">{panelLabels[locale].company}</p>
                <Link to={companyJobsPath(data.job.company.name)} className="mt-2 block break-words text-2xl font-black tracking-tight text-primary transition hover:text-primary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{data.job.company.name}</Link>
                <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-on-surface-variant"><BriefcaseBusiness className="h-4 w-4 text-primary" />{relatedJobs.length} {copy.positions}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {relatedJobs.length ? relatedJobs.map((job) => {
                  const isCurrentJob = job.slug === data.job.slug;
                  return <div key={job.slug} className={`border-b border-outline-variant px-5 py-4 transition ${isCurrentJob ? 'border-l-2 border-l-primary bg-surface-container-low' : 'hover:bg-surface-container-low'}`}>
                    <div className="flex items-start gap-3">
                      <Link to={`/jobs/${job.slug}`} aria-current={isCurrentJob ? 'page' : undefined} className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <p className={`line-clamp-2 text-base font-bold leading-snug ${isCurrentJob ? 'text-primary' : 'text-on-surface'}`}>{job.title}</p>
                        <p className="mt-2 flex items-center gap-1.5 text-sm leading-snug text-on-surface-variant"><MapPin className="h-4 w-4 shrink-0" />{job.location || copy.noDescription}</p>
                        <p className="mt-1.5 text-sm text-on-surface-variant">{job.skillCount} {copy.skills}</p>
                      </Link>
                      <BookmarkButton
                        jobSlug={job.slug}
                        bookmarked={job.bookmarked}
                        saveLabel={copy.saveJob}
                        removeLabel={copy.removeSavedJob}
                        onChange={(bookmarked) => updateRelatedBookmark(job.slug, bookmarked)}
                        className="mt-0.5 h-8 w-8 rounded-md"
                      />
                    </div>
                  </div>;
                }) : <p className="px-3 py-5 text-sm text-on-surface-variant">{copy.noJobs}</p>}
              </div>
            </section>
          </aside>

          <article className="min-w-0 lg:min-h-0">
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 [scrollbar-gutter:stable]">
                <div className="border-b border-outline-variant pb-6">
                  <Link to={companyJobsPath(data.job.company.name)} className="inline-flex rounded-lg border border-primary bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden">{data.job.company.name}</Link>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant"><Building2 className="h-5 w-5 text-primary" /><span>{copy.updated} {formatDate(data.job.publishedAt, locale)}</span></div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{data.job.title}</h1>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                    {detailedLocationLabel(data.job, locale) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{detailedLocationLabel(data.job, locale)}</span>}
                    <span>{data.job.remoteType === 'remote' ? copy.remoteOnly : data.job.remoteType === 'hybrid' ? copy.hybrid : data.job.remoteType === 'on_site' ? copy.onsite : copy.allWorkplaces}</span>
                    {data.job.employmentType && <span>{data.job.employmentType}</span>}
                  </div>
                  <div className="mt-5 flex flex-nowrap items-center gap-2">
                    <BookmarkButton jobSlug={data.job.slug} bookmarked={data.job.bookmarked} saveLabel={copy.saveJob} removeLabel={copy.removeSavedJob} onChange={updateBookmark} showLabel className="h-auto w-auto min-w-0 flex-1 justify-center gap-2 whitespace-nowrap px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm" />
                    {data.job.applyUrl && <a href={data.job.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition hover:bg-primary/90 sm:px-4 sm:text-sm"><ArrowUpRight className="h-4 w-4 shrink-0" />{copy.apply}</a>}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{copy.jobDescription}</h2><span className="rounded-full border border-primary/25 bg-primary-container/40 px-2 py-0.5 text-xs font-medium text-primary">{descriptionBadge}{data.job.language && data.job.language !== 'und' ? ` · ${data.job.language}` : ''}</span></div>
                {data.sections.length ? data.sections.map((section) => <div key={section.id} className="mt-6"><h3 className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">{section.title || copy.jobDescription}</h3>{richSectionContent(section, activeSkill, selectSkill)}</div>) : <p className="mt-5 leading-relaxed text-on-surface-variant">{copy.noDescription}</p>}
                {semanticSignals.length > 0 && <section className="mt-7 border-t border-outline-variant pt-5"><h3 className="text-sm font-bold text-on-surface">{copy.extractedSignals}</h3><div className="mt-3 flex flex-wrap gap-2">{semanticSignals.map((tag) => <span key={`${tag.type}-${tag.key}`} className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface">{tag.label}</span>)}</div></section>}
                <p className="mt-7 border-y border-outline-variant py-3 text-sm leading-relaxed text-on-surface-variant"><span className="font-semibold text-on-surface">{copy.source}: </span>{sourcePolicyNotice}</p>
              </div>
            </section>
          </article>

          <aside className="hidden lg:block lg:min-h-0">
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="shrink-0 border-b border-outline-variant p-4">
                <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-bold">{copy.skillsInJd}</h2></div>
                {activeSkillData && <p className="mt-3 border-l-2 border-primary pl-2 text-sm text-primary"><span className="font-semibold">{copy.selectedSkill}: </span>{localSkillName(activeSkillData.name, locale)}</p>}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
                {data.skills.map((skill) => {
                  const isExpanded = expandedSkill === skill.id;
                  const coursesRegionId = `skill-courses-${skill.id}`;
                  return <section id={`skill-${skill.id}`} key={skill.id} className={`scroll-mt-4 border-b border-outline-variant py-4 first:pt-0 last:border-b-0 ${activeSkill === skill.id ? 'border-l-2 border-l-primary pl-3' : ''}`}>
                    <button type="button" className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => selectSkill(skill.id)}><p className="font-semibold text-on-surface">{localSkillName(skill.name, locale)}</p><p className="mt-1 text-xs text-on-surface-variant">{localizedSkillCategory(skill.category, locale)} · {skill.evidenceCount} {copy.evidence}</p></button>
                    {(skill.relationships ?? []).length > 0 && <div className="mt-3">
                      <p className="text-xs font-semibold text-on-surface-variant">{copy.relatedSkills}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(skill.relationships ?? []).slice(0, 6).map((relationship) => <button
                          key={`${relationship.skillId}-${relationship.relationType}`}
                          type="button"
                          onClick={() => selectSkill(relationship.skillId)}
                          className="rounded-full border border-primary/35 px-2 py-1 text-xs font-medium text-primary transition hover:border-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title={relationship.relationType.replace(/_/g, ' ')}
                        >
                          {localSkillName(relationship.name, locale)}
                        </button>)}
                      </div>
                    </div>}
                    <div className="mt-3 border-t border-outline-variant pt-2">
                      <button type="button" onClick={() => toggleCourses(skill.id)} aria-expanded={isExpanded} aria-controls={coursesRegionId} className="flex w-full items-center justify-between gap-3 py-1 text-left text-xs font-semibold text-on-surface-variant transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <span>{panelLabels[locale].courses} · {skill.courses.length}</span>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" aria-hidden="true" /> : <ChevronUp className="h-4 w-4 text-primary" aria-hidden="true" />}
                      </button>
                      {isExpanded && <div id={coursesRegionId} className="mt-3 space-y-1 border-l border-primary/45 pl-3">
                        {skill.courses.length ? skill.courses.map((coverage) => {
                          const destination = coursePath(coverage.courseId, coverage.chapterRouteId, coverage.lessonRouteId, locale);
                          const params = new URLSearchParams({ job: data.job.slug, skill: skill.slug, source: 'jd_map' });
                          return <Link key={`${coverage.courseId}-${coverage.lessonRouteId ?? coverage.chapterRouteId}`} to={`${destination.path}?${params.toString()}`} className="group block py-2 text-sm transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            <div className="flex gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-xs font-medium text-primary">{destination.courseTitle} · {copy.coverage[coverage.coverageLevel] ?? coverage.coverageLevel}</p><p className="mt-0.5 font-semibold leading-snug text-on-surface group-hover:text-primary">{destination.label}</p></div></div>
                          </Link>;
                        }) : <p className="py-2 text-xs text-on-surface-variant">{copy.noCourse}</p>}
                      </div>}
                    </div>
                  </section>;
                })}
                {!data.skills.length && <div className="py-5"><p className="text-sm leading-relaxed text-on-surface-variant">{semanticSignals.length ? copy.semanticSignalsNotice : copy.noDescription}</p>{semanticSignals.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{semanticSignals.map((tag) => <span key={`${tag.type}-${tag.key}`} className="rounded-full border border-primary/30 bg-primary-container/30 px-2.5 py-1 text-xs font-medium text-primary">{tag.label}</span>)}</div>}</div>}
              </div>
            </section>
          </aside>
          </div>
        </div>
      </main>
      <MobileSkillDrawer open={isMobileSkillPanelOpen} onClose={() => setIsMobileSkillPanelOpen(false)} locale={locale}>
        <MobileSkillContent skill={activeSkillData} jobSlug={data.job.slug} locale={locale} copy={copy} onClose={() => setIsMobileSkillPanelOpen(false)} />
      </MobileSkillDrawer>
      <div className="lg:hidden"><Footer /></div>
    </div>
  );
}
