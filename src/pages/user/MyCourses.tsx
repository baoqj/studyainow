import { BookOpen, GraduationCap, Grid2X2, List, Play, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCatalogCourseStartPath, getCatalogCourses, getCatalogLessonPath, type AppLocale, type CatalogCourse } from '../../data/courseCatalog';
import { getAccountCopy, type AccountCopy } from '../../data/accountCopy';
import { fetchAccountOverview, type AccountOverview } from '../../lib/account';

type CourseView = 'list' | 'cards';
const COURSE_VIEW_STORAGE_KEY = 'studyainow-my-courses-view';

type CourseCard = {
  course: AccountOverview['courses'][number];
  definition?: CatalogCourse;
  totalLessons: number;
  completedLessons: number;
  isGraduated: boolean;
  resumeLesson?: { chapter: number; lesson: number; routeId: string };
  startPath: string;
  resumePath: string;
};

type MyCoursesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: AccountOverview };

function safeStorageGet(key: string) {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked in private browsing or restrictive browser policy.
  }
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeLessonProgress(value: unknown): AccountOverview['courses'][number]['lesson_progress'][number] | null {
  if (!isRecord(value)
    || typeof value.course_id !== 'string'
    || typeof value.chapter_slug !== 'string'
    || typeof value.lesson_route_id !== 'string'
    || !value.lesson_route_id.trim()
    || typeof value.status !== 'string'
    || !['reading', 'completed'].includes(value.status)
    || !Number.isFinite(value.chapter_number)
    || !Number.isFinite(value.lesson_number)
    || !Number.isFinite(value.progress_percent)
    || !Number.isFinite(value.scroll_y)
    || !isValidDate(value.last_read_at)
    || (value.completed_at !== null && !isValidDate(value.completed_at))) return null;

  return {
    course_id: value.course_id,
    chapter_number: Math.max(0, Math.trunc(value.chapter_number as number)),
    chapter_slug: value.chapter_slug,
    lesson_route_id: value.lesson_route_id.trim(),
    lesson_number: Math.max(0, Math.trunc(value.lesson_number as number)),
    status: value.status as 'reading' | 'completed',
    progress_percent: Math.min(100, Math.max(0, Number(value.progress_percent))),
    scroll_y: Math.max(0, Math.trunc(Number(value.scroll_y))),
    last_read_at: value.last_read_at,
    completed_at: value.completed_at as string | null,
  };
}

function normalizeOverview(value: AccountOverview): AccountOverview {
  const courses = Array.isArray(value?.courses) ? value.courses.flatMap((course) => {
    if (!isRecord(course)
      || typeof course.course_id !== 'string'
      || typeof course.course_slug !== 'string'
      || typeof course.course_title !== 'string'
      || !Number.isFinite(course.completed_chapters)
      || !Number.isFinite(course.chapter_count)
      || !Number.isFinite(course.average_progress)) return [];

    return [{
      course_id: course.course_id,
      course_slug: course.course_slug,
      course_title: course.course_title,
      completed_chapters: Math.max(0, Math.trunc(course.completed_chapters)),
      chapter_count: Math.max(0, Math.trunc(course.chapter_count)),
      average_progress: Math.min(100, Math.max(0, Number(course.average_progress))),
      last_read_at: isValidDate(course.last_read_at) ? course.last_read_at : null,
      lesson_progress: (Array.isArray(course.lesson_progress) ? course.lesson_progress : []).flatMap((item) => {
        const progress = normalizeLessonProgress(item);
        return progress ? [progress] : [];
      }),
    }];
  }) : [];

  return { ...value, courses };
}

function format(template: string, values: Record<string, number>) {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => String(values[key] ?? ''));
}

function lessonFromRoute(routeId: string) {
  const match = routeId.match(/^(\d+)-(\d+)$/);
  if (!match) return undefined;
  return { chapter: Number(match[1]), lesson: Number(match[2]), routeId };
}

function buildCourseCard(
  course: AccountOverview['courses'][number],
  definitions: CatalogCourse[],
): CourseCard {
  const definition = definitions.find((item) => item.id === course.course_slug);
  const routes = definition?.lessonRouteIds ?? [];
  const knownRoutes = new Set(routes);
  const completed = new Set(course.lesson_progress.filter((item) => item.status === 'completed' && (!definition || knownRoutes.has(item.lesson_route_id))).map((item) => item.lesson_route_id));
  const completedLessons = definition ? routes.filter((routeId) => completed.has(routeId)).length : Math.min(completed.size, Math.max(0, course.completed_chapters));
  const totalLessons = definition?.lessons ?? Math.max(course.chapter_count, completedLessons);
  const isGraduated = totalLessons > 0 && completedLessons === totalLessons;
  const recent = [...course.lesson_progress].sort((left, right) => right.last_read_at.localeCompare(left.last_read_at))[0];
  const currentIndex = recent ? routes.findIndex((routeId) => routeId === recent.lesson_route_id) : -1;
  const nextIncomplete = currentIndex >= 0
    ? routes.slice(currentIndex + 1).find((routeId) => !completed.has(routeId))
    : undefined;
  const recordedLesson = currentIndex >= 0 ? routes[currentIndex] : undefined;
  const resumeRoute = recent?.status === 'completed'
    ? nextIncomplete ?? routes.find((routeId) => !completed.has(routeId))
    : recordedLesson ?? routes.find((routeId) => !completed.has(routeId));
  const resumeLesson = resumeRoute ? lessonFromRoute(resumeRoute) : undefined;
  const fallbackPath = `/courses/${encodeURIComponent(course.course_slug)}`;

  return {
    course,
    definition,
    totalLessons,
    completedLessons,
    isGraduated,
    resumeLesson,
    startPath: definition ? getCatalogCourseStartPath(definition) : fallbackPath,
    resumePath: resumeLesson ? getCatalogLessonPath(course.course_slug, resumeLesson.chapter, resumeLesson.routeId) : fallbackPath,
  };
}

function CourseTile({ item, view, copy, onSelect }: { item: CourseCard; view: CourseView; copy: AccountCopy; onSelect: (course: CourseCard) => void }) {
  const percentage = item.totalLessons ? Math.round((item.completedLessons / item.totalLessons) * 100) : 0;
  const lesson = item.resumeLesson;
  const title = item.definition?.title ?? item.course.course_title;
  const completedLabel = format(copy.lessonsComplete, { completed: item.completedLessons, total: item.totalLessons });
  const currentLesson = lesson && <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-on-surface-variant">{format(copy.currentLesson, { chapter: lesson.chapter, lesson: lesson.lesson })}</p>;
  const action = <span className={`inline-flex items-center gap-1 font-bold ${item.isGraduated ? 'text-emerald-700' : 'text-primary'}`}><Play className="h-4 w-4 fill-current" />{item.isGraduated ? copy.restart : copy.continueAction}</span>;
  const progress = <div className={`h-2 overflow-hidden rounded-full ${item.isGraduated ? 'bg-emerald-200' : 'bg-surface-container-highest'}`}><div className={item.isGraduated ? 'h-full bg-emerald-600' : 'h-full bg-primary'} style={{ width: `${percentage}%` }} /></div>;

  if (view === 'list') {
    return <button
      key={item.course.course_id}
      type="button"
      data-course-view="list"
      onClick={() => onSelect(item)}
      className={`group w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/35 sm:p-5 ${
        item.isGraduated
          ? 'border-emerald-300 bg-[linear-gradient(105deg,#f0fdf4,#ecfdf5_62%,#fffbeb)] hover:border-emerald-400'
          : 'border-outline-variant bg-surface-container-lowest hover:border-primary/60 hover:bg-surface-container-low'
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.isGraduated ? 'bg-emerald-600 text-white' : 'bg-primary-container text-primary'}`}>
          {item.isGraduated ? <GraduationCap className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold leading-snug text-on-surface sm:text-xl">{title}</h2>
            {item.isGraduated
              ? <span className="hidden shrink-0 items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white sm:inline-flex"><GraduationCap className="h-3.5 w-3.5" />{copy.graduated}</span>
              : <span className="shrink-0 text-sm font-bold text-primary">{percentage}%</span>}
          </div>
          {item.isGraduated
            ? <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-emerald-900/80">{copy.graduatedBody}</p>
            : currentLesson ?? <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-on-surface-variant">{copy.coursesIntro}</p>}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-outline-variant/70 pt-3 text-sm">
        <span className={item.isGraduated ? 'font-semibold text-emerald-800' : 'text-on-surface-variant'}>{completedLabel}</span>
        {action}
      </div>
      <div className="mt-3">{progress}</div>
    </button>;
  }

  return <button
    key={item.course.course_id}
    type="button"
    data-course-view="cards"
    onClick={() => onSelect(item)}
    className={`group relative w-full overflow-hidden rounded-2xl border p-6 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/35 ${
      item.isGraduated
        ? 'border-emerald-300 bg-[linear-gradient(135deg,#f0fdf4,#ecfdf5_52%,#fffbeb)] hover:-translate-y-0.5 hover:border-emerald-400'
        : 'border-outline-variant bg-surface-container-lowest hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.isGraduated ? 'bg-emerald-600 text-white' : 'bg-primary-container text-primary'}`}>
        {item.isGraduated ? <GraduationCap className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
      </div>
      {item.isGraduated
        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white"><GraduationCap className="h-3.5 w-3.5" />{copy.graduated}</span>
        : <span className="text-sm font-bold text-primary">{percentage}%</span>}
    </div>
    <h2 className="mt-5 text-xl font-bold text-on-surface">{title}</h2>
    {item.isGraduated
      ? <p className="mt-2 min-h-10 text-sm leading-relaxed text-emerald-900/80">{copy.graduatedBody}</p>
      : currentLesson ?? <p className="mt-2 min-h-10 text-sm leading-relaxed text-on-surface-variant">{copy.coursesIntro}</p>}
    <div className="mt-5 flex items-center justify-between gap-4 text-sm">
      <span className={item.isGraduated ? 'font-semibold text-emerald-800' : 'text-on-surface-variant'}>{completedLabel}</span>
      {action}
    </div>
    <div className="mt-3">{progress}</div>
  </button>;
}

export function MyCourses() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getAccountCopy(locale);
  const navigate = useNavigate();
  const [state, setState] = useState<MyCoursesState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingCourse, setPendingCourse] = useState<CourseCard | null>(null);
  const [view, setView] = useState<CourseView>(() => safeStorageGet(COURSE_VIEW_STORAGE_KEY) === 'cards' ? 'cards' : 'list');

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchAccountOverview({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data: normalizeOverview(result) });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    safeStorageSet(COURSE_VIEW_STORAGE_KEY, view);
  }, [view]);

  const cards = useMemo(() => {
    if (state.status !== 'ready') return [];
    const definitions = getCatalogCourses(locale);
    return state.data.courses.map((course) => buildCourseCard(course, definitions));
  }, [state, locale]);

  if (state.status === 'loading') return <div data-testid="my-courses-loading" className="py-12 text-center text-on-surface-variant">{copy.loadingAccount}</div>;

  if (state.status === 'error') return <section data-testid="my-courses-error" role="alert" className="mx-auto mt-8 max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
    <p className="font-semibold">{copy.coursesLoadFailed}</p>
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90">{copy.retry}</button><button type="button" onClick={() => navigate('/')} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">{copy.returnToCourses}</button></div>
  </section>;

  const selectCourse = (item: CourseCard) => {
    if (item.isGraduated) navigate(item.startPath);
    else setPendingCourse(item);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h1 className="font-h1 text-[32px] text-on-surface">{copy.courses}</h1><p className="mt-2 max-w-2xl text-on-surface-variant">{copy.coursesIntro}</p></div>
        <div data-testid="my-courses-view-mode" role="group" aria-label={copy.courseDisplayMode} className="inline-flex shrink-0 self-end overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-1 sm:self-start">
          <button type="button" aria-pressed={view === 'list'} title={copy.courseListView} onClick={() => setView('list')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${view === 'list' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}><List className="h-4 w-4" /><span className="hidden sm:inline">{copy.courseListView}</span></button>
          <button type="button" aria-pressed={view === 'cards'} title={copy.courseCardView} onClick={() => setView('cards')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${view === 'cards' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}><Grid2X2 className="h-4 w-4" /><span className="hidden sm:inline">{copy.courseCardView}</span></button>
        </div>
      </div>

      <div className={view === 'cards' ? 'grid gap-5 md:grid-cols-2' : 'space-y-3'}>
        {cards.map((item) => <div key={item.course.course_id} className="contents"><CourseTile item={item} view={view} copy={copy} onSelect={selectCourse} /></div>)}
        {!cards.length && <p className="rounded-2xl border border-dashed border-outline-variant p-7 text-sm leading-relaxed text-on-surface-variant">{copy.noCourses}</p>}
      </div>

      {pendingCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
          <button className="absolute inset-0 bg-slate-950/45" aria-label={copy.cancel} onClick={() => setPendingCourse(null)} />
          <section role="dialog" aria-modal="true" aria-labelledby="continue-course-title" className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl">
            <button type="button" aria-label={copy.cancel} onClick={() => setPendingCourse(null)} className="absolute right-4 top-4 rounded-full p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"><X className="h-4 w-4" /></button>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-primary"><BookOpen className="h-6 w-6" /></div>
            <h2 id="continue-course-title" className="mt-5 pr-8 text-2xl font-bold text-on-surface">{copy.continuePrompt}</h2>
            <p className="mt-2 leading-relaxed text-on-surface-variant">{copy.continueBody}</p>
            {pendingCourse.resumeLesson && <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface"><span className="font-semibold">{format(copy.currentLesson, { chapter: pendingCourse.resumeLesson.chapter, lesson: pendingCourse.resumeLesson.lesson })}</span></p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPendingCourse(null)} className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container">{copy.cancel}</button><button type="button" onClick={() => navigate(pendingCourse.resumePath)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90"><Play className="h-4 w-4 fill-current" />{copy.continueAction}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
