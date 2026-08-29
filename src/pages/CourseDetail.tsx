import { useEffect, useState } from 'react';
import { PanelLeftOpen, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { CourseNavbar } from '../components/course/CourseNavbar';
import { SidebarNavigation } from '../components/course/SidebarNavigation';
import { ContentArea } from '../components/course/ContentArea';
import { TOC } from '../components/course/TOC';
import { CourseFooter } from '../components/course/CourseFooter';
import { extractHeadings } from '../components/course/MarkdownRenderer';
import { findChapter, findLesson, getChapter, getCourse, getLessonNeighbors, loadCourse } from '../data/courseContent';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../data/courseContent';
import { fetchCourseAccess, type CourseAccess } from '../lib/account';
import { trackCourseClick } from '../lib/courseAnalytics';
import { NotFound } from './NotFound';

export function CourseDetail() {
  const { courseId, chapterId, lessonId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
  const [access, setAccess] = useState<CourseAccess | null>(null);
  const [matchedCourse, setMatchedCourse] = useState<ReturnType<typeof getCourse> | undefined>();
  const [courseLoading, setCourseLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setCourseLoading(true);
    setMatchedCourse(undefined);
    void loadCourse(courseId ?? '', locale).then((course) => {
      if (!active) return;
      setMatchedCourse(course);
      setCourseLoading(false);
    });
    return () => { active = false; };
  }, [courseId, locale]);
  const course = matchedCourse ?? getCourse(undefined, locale);
  const matchedChapter = matchedCourse ? findChapter(matchedCourse, chapterId) : undefined;
  const chapter = matchedChapter ?? getChapter(course, undefined);
  const matchedLesson = matchedChapter && lessonId ? findLesson(matchedChapter, lessonId) : undefined;
  const lesson = matchedLesson;
  const validRoute = Boolean(matchedCourse && matchedChapter && (!lessonId || matchedLesson));
  const { previous, next } = getLessonNeighbors(course, lesson);
  const markdown = lesson?.body ?? chapter.body;

  useEffect(() => {
    if (validRoute) trackCourseClick(course.id, chapter.chapter);
  }, [course.id, chapter.chapter, lesson?.routeId, validRoute]);

  useEffect(() => {
    if (!validRoute) return;
    let active = true;
    setAccess(null);
    fetchCourseAccess(course.id).then((result) => active && setAccess(result)).catch(() => active && setAccess({ authenticated: false, courseManaged: true, chapters: [] }));
    return () => { active = false; };
  }, [course.id, validRoute]);

  const chapterAccess = access?.chapters.find((item) => item.chapterNumber === chapter.chapter);
  // Do not reveal managed content while the access request is pending or failed.
  const locked = access === null || access.courseManaged && (chapterAccess?.locked ?? true);
  const lockedChapterNumbers = new Set<number>();
  for (const item of access?.chapters ?? []) if (item.locked) lockedChapterNumbers.add(item.chapterNumber);

  const persistProgress = (status: 'reading' | 'completed', forcePercent?: number) => {
    if (!access?.authenticated) return;

    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progressPercent = forcePercent ?? Math.min(100, Math.max(1, Math.round((window.scrollY / scrollable) * 100)));

    fetch('/api/progress', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        course_id: course.id,
        chapter_number: chapter.chapter,
        chapter_lesson_count: chapter.lessons.length,
        lesson_route_id: lesson?.routeId,
        lesson_number: lesson?.lesson,
        progress_percent: progressPercent,
        scroll_y: Math.round(window.scrollY),
        status,
      }),
    }).catch(() => undefined);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [chapter.routeId, lesson?.routeId]);

  useEffect(() => {
    setIsChapterMenuOpen(false);
  }, [chapter.routeId, lesson?.routeId]);

  useEffect(() => {
    if (!isChapterMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsChapterMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isChapterMenuOpen]);

  useEffect(() => {
    let lastSent = 0;
    let timeout: number | undefined;

    if (!access?.authenticated) return;

    const sendProgress = (force = false) => {
      const now = Date.now();
      if (!force && now - lastSent < 2500) return;
      lastSent = now;
      persistProgress('reading');
    };

    const onScroll = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => sendProgress(), 350);
    };
    const onBeforeUnload = () => sendProgress(true);

    sendProgress(true);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', onBeforeUnload);
      sendProgress(true);
    };
  }, [access?.authenticated, course.id, chapter.chapter, lesson?.routeId]);

  if (courseLoading) return <div data-testid="course-loading" className="min-h-[38vh] px-5 py-16 text-center text-on-surface-variant">{t('common.loading')}</div>;
  if (!validRoute) return <NotFound />;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md text-body-md">
      <CourseNavbar course={course} />

      <button
        aria-controls="mobile-course-menu"
        aria-expanded={isChapterMenuOpen}
        aria-label={t('course.outline')}
        title={t('course.outline')}
        data-testid="mobile-course-menu-button"
        onClick={() => setIsChapterMenuOpen(true)}
        className="fixed left-0 top-24 z-40 flex h-11 w-11 items-center justify-center rounded-r-full bg-primary text-on-primary shadow-lg transition-transform hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-primary/30 lg:hidden"
      >
        <PanelLeftOpen className="h-5 w-5" />
      </button>

      <div
        className={`fixed inset-0 z-[70] lg:hidden ${isChapterMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isChapterMenuOpen}
      >
        <button
          aria-label={t('filter.clear')}
          data-testid="mobile-course-menu-backdrop"
          onClick={() => setIsChapterMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/35 transition-opacity ${
            isChapterMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          id="mobile-course-menu"
          data-open={isChapterMenuOpen ? 'true' : 'false'}
          data-testid="mobile-course-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t('course.outline')}
          className={`relative h-full w-[86vw] max-w-[340px] bg-slate-50 shadow-2xl transition-transform duration-300 ease-out ${
            isChapterMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            aria-label={t('filter.clear')}
            title={t('filter.clear')}
            onClick={() => setIsChapterMenuOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarNavigation
            course={course}
            currentChapter={chapter}
            currentLesson={lesson}
            lockedChapterNumbers={lockedChapterNumbers}
            mode="drawer"
            onNavigate={() => setIsChapterMenuOpen(false)}
          />
        </div>
      </div>
      
      <div className="max-w-[1440px] mx-auto w-full flex-grow flex pt-16">
        <SidebarNavigation course={course} currentChapter={chapter} currentLesson={lesson} lockedChapterNumbers={lockedChapterNumbers} />
        <ContentArea
          course={course}
          chapter={chapter}
          lesson={lesson}
          previous={previous}
          next={next}
          locked={locked}
          onCompleteLesson={() => persistProgress('completed', 100)}
        />
        <TOC headings={extractHeadings(markdown)} />
      </div>
      
      <CourseFooter />
    </div>
  );
}
