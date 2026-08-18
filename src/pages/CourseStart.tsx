import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Clock, Layers3, LockKeyhole } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CourseFooter } from '../components/course/CourseFooter';
import { CourseNavbar } from '../components/course/CourseNavbar';
import { getChapterPath, getCourse, getCourseStartPath } from '../data/courseContent';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../data/courseContent';
import { fetchCourseAccess, type CourseAccess } from '../lib/account';
import { trackCourseClick } from '../lib/courseAnalytics';

const skillToggleCopy: Record<AppLocale, { expand: string; collapse: string; count: string }> = {
  'zh-CN': { expand: '展开全部技能', collapse: '收起技能', count: '个技能' },
  'zh-TW': { expand: '展開全部技能', collapse: '收合技能', count: '項技能' },
  en: { expand: 'Show all skills', collapse: 'Collapse skills', count: 'skills' },
  fr: { expand: 'Afficher toutes les compétences', collapse: 'Réduire les compétences', count: 'compétences' },
  es: { expand: 'Mostrar todas las habilidades', collapse: 'Contraer habilidades', count: 'habilidades' },
};

export function CourseStart() {
  const { courseId } = useParams();
  const { t, i18n } = useTranslation();
  const course = getCourse(courseId, (i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  const startPath = getCourseStartPath(course);
  const [access, setAccess] = useState<CourseAccess | null>(null);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [skillsExceedThreeRows, setSkillsExceedThreeRows] = useState(false);
  const skillsRef = useRef<HTMLDivElement>(null);
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const toggleCopy = skillToggleCopy[locale] ?? skillToggleCopy.en;
  useEffect(() => { trackCourseClick(course.id); }, [course.id]);
  useEffect(() => {
    let active = true;
    fetchCourseAccess(course.id).then((result) => active && setAccess(result)).catch(() => active && setAccess({ authenticated: false, courseManaged: true, chapters: [] }));
    return () => { active = false; };
  }, [course.id]);

  useEffect(() => {
    if (!access?.authenticated) return;
    const firstChapter = course.chapters[0];
    const firstLesson = firstChapter?.lessons[0];
    if (!firstChapter) return;

    fetch('/api/progress', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        course_id: course.id,
        chapter_number: firstChapter.chapter,
        chapter_lesson_count: firstChapter.lessons.length,
        lesson_route_id: firstLesson?.routeId,
        lesson_number: firstLesson?.lesson,
        progress_percent: 0,
        scroll_y: 0,
        status: 'reading',
      }),
    }).catch(() => undefined);
  }, [access?.authenticated, course.id]);

  useLayoutEffect(() => {
    const element = skillsRef.current;
    if (!element) return;
    const measureRows = () => {
      const rowTops = new Set(Array.from(element.children, (child) => (child as HTMLElement).offsetTop));
      setSkillsExceedThreeRows(rowTops.size > 3);
    };
    measureRows();
    const observer = new ResizeObserver(measureRows);
    observer.observe(element);
    return () => observer.disconnect();
  }, [course.id]);

  useEffect(() => { setSkillsExpanded(false); }, [course.id]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md">
      <CourseNavbar course={course} />

      <main className="pt-16">
        <section className="border-b border-outline-variant bg-surface-container-low">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
            <div>
              <nav aria-label={t('course.catalog')} className="mb-6 flex items-center gap-2 text-label-sm font-label-sm text-outline">
                <Link to="/" className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {t('course.catalog')}
                </Link>
                <ArrowRight className="h-4 w-4" />
                <span className="rounded px-1 py-0.5 text-on-surface">{course.topic}</span>
              </nav>

              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded bg-surface-container-lowest px-3 py-1 text-[12px] font-label-sm text-on-surface-variant shadow-sm">
                  {course.status}
                </span>
                <span className="rounded bg-surface-container-lowest px-3 py-1 text-[12px] font-label-sm text-on-surface-variant shadow-sm">
                  {course.difficulty === 'Beginner' ? t('filter.beginner') : course.difficulty === 'Intermediate' ? t('filter.intermediate') : t('filter.advanced')}
                </span>
              </div>

              <h1 className="font-h1 text-h1 text-on-surface">{course.title}</h1>
              {course.subtitle && <p className="mt-3 text-xl font-semibold text-primary">{course.subtitle}</p>}
              <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">{course.description}</p>

              {course.skills.length > 0 && (
                <div className="mt-5">
                  <div
                    id="course-skill-tags"
                    ref={skillsRef}
                    data-collapsed={skillsExceedThreeRows && !skillsExpanded ? 'true' : 'false'}
                    className={`flex flex-wrap gap-2 ${skillsExceedThreeRows && !skillsExpanded ? 'max-h-7 overflow-hidden' : ''}`}
                    aria-label="Course skills"
                  >
                    {course.skills.map((skill) => (
                      <span key={skill} className="whitespace-nowrap rounded-full border border-primary/20 bg-primary-container/30 px-3 py-1 text-xs font-semibold text-primary">
                        {skill.replaceAll('-', ' ')}
                      </span>
                    ))}
                  </div>
                  {skillsExceedThreeRows && (
                    <button
                      type="button"
                      aria-controls="course-skill-tags"
                      aria-expanded={skillsExpanded}
                      onClick={() => setSkillsExpanded((current) => !current)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary-container/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {skillsExpanded ? toggleCopy.collapse : toggleCopy.expand}
                      <span className="text-on-surface-variant">· {course.skills.length} {toggleCopy.count}</span>
                      {skillsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={startPath}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-label-sm text-on-primary hover:bg-primary/90"
                >
                  {t('course.startFirst')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#chapters"
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-5 py-3 text-sm font-label-sm text-on-surface hover:bg-surface-container-low"
                >
                  {t('course.viewChapters')}
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              {course.imageUrl ? (
                <img src={course.imageUrl} alt={course.title} className="h-72 w-full object-cover" />
              ) : (
                <div className="flex h-72 items-center justify-center bg-[linear-gradient(135deg,#102a43,#0ea5a4)] text-7xl font-black text-white/40">AI</div>
              )}
              <div className="grid grid-cols-3 divide-x divide-outline-variant">
                <div className="p-4">
                  <BookOpen className="mb-2 h-5 w-5 text-primary" />
                  <div className="text-sm font-semibold text-on-surface">{t('course.chapterAndLessons', { chapters: course.chapters.length, lessons: course.lessons })}</div>
                  <div className="text-xs text-on-surface-variant">{t('course.guidedCourse')}</div>
                </div>
                <div className="p-4">
                  <Layers3 className="mb-2 h-5 w-5 text-primary" />
                  <div className="text-sm font-semibold text-on-surface">{t('course.lessons', { count: course.lessons })}</div>
                  <div className="text-xs text-on-surface-variant">{t('course.lessonExercises')}</div>
                </div>
                <div className="p-4">
                  <Clock className="mb-2 h-5 w-5 text-primary" />
                  <div className="text-sm font-semibold text-on-surface">{t('course.practice')}</div>
                  <div className="text-xs text-on-surface-variant">{t('course.taskByLesson')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {course.learningMapUrl && (
          <section className="mx-auto max-w-7xl px-6 pt-12">
            <div className="grid gap-8 overflow-hidden rounded-[28px] border border-outline-variant bg-surface-container-lowest p-6 shadow-sm lg:grid-cols-[0.42fr_0.58fr] lg:items-center lg:p-9">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Learning map</p>
                <h2 className="mt-3 font-h2 text-h2 text-on-surface">十章不是目录，是一条交付路径</h2>
                <p className="mt-4 leading-relaxed text-on-surface-variant">每章包含概念拆解、场景实战与综合交付三节。点击、选择、拖拽、排序和滑动实验会把抽象知识变成可观察的决策结果。</p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-on-surface-variant">
                  {course.duration && <span className="rounded-full bg-surface-container px-3 py-1.5">{course.duration}</span>}
                  {course.audience && <span className="rounded-full bg-surface-container px-3 py-1.5">{course.audience}</span>}
                </div>
              </div>
              <a href={course.learningMapUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-outline-variant bg-[#fbfaf6]">
                <img src={course.learningMapUrl} alt={`${course.title}十章学习地图`} className="max-h-[540px] w-full object-contain" />
              </a>
            </div>
          </section>
        )}

        <section id="chapters" className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-h2 text-h2 text-on-surface">{t('course.outline')}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{t('course.outlineBody')}</p>
            </div>
            <Link to={startPath} className="hidden text-sm font-label-sm text-primary hover:underline sm:inline">
              {t('course.fromFirst')}
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {course.chapters.map((chapter) => {
              const locked = access?.courseManaged && (access.chapters.find((item) => item.chapterNumber === chapter.chapter)?.locked ?? true);
              return (
              <Link
                key={chapter.routeId}
                to={getChapterPath(course.id, chapter)}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:border-primary hover:bg-surface-container-low"
              >
                <div className="mb-2 flex items-center gap-2 text-[12px] font-label-sm text-primary">
                  {t('course.chapter', { number: chapter.chapter.toString().padStart(2, '0') })} · {t('course.lessons', { count: chapter.lessons.length })}
                  {locked && <LockKeyhole className="h-3.5 w-3.5" />}
                </div>
                <h3 className="font-h3 text-[19px] leading-snug text-on-surface">{chapter.title.replace(/^\d+\.\s*/, '')}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{chapter.summary}</p>
              </Link>
              );
            })}
          </div>
        </section>
      </main>

      <CourseFooter />
    </div>
  );
}
