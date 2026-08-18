import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getChapterPath, getLessonPath, type Chapter, type Course, type Lesson } from '../../data/courseContent';
import { CliLab } from './CliLab';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InteractiveCourseware } from './InteractiveCourseware';
import { FdeInteractiveCourseware } from './FdeInteractiveCourseware';
import { useTranslation } from 'react-i18next';
import { getAccountCopy } from '../../data/accountCopy';
import type { AppLocale } from '../../data/courseContent';

export function ContentArea({
  course,
  chapter,
  lesson,
  previous,
  next,
  locked = false,
  onCompleteLesson,
}: {
  course: Course;
  chapter: Chapter;
  lesson?: Lesson;
  previous?: Lesson;
  next?: Lesson;
  locked?: boolean;
  onCompleteLesson?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const copy = getAccountCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  const markdown = lesson?.body ?? chapter.body;
  const title = lesson?.title ?? chapter.title;
  const summary = lesson?.summary || chapter.summary;
  const duration = lesson?.duration ?? chapter.duration;
  const firstLesson = chapter.lessons[0];
  const interactiveLabId = lesson?.labId;

  return (
    <main className="min-w-0 flex-grow w-full max-w-[840px] px-5 py-10 sm:px-8 sm:py-12 lg:px-12 mx-auto">
      <nav aria-label={t('course.catalog')} className="flex flex-wrap items-center gap-2 text-label-sm font-label-sm text-outline mb-stack-md">
        <Link to="/" className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors">
          {t('course.catalog')}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link
          to={`/courses/${course.id}`}
          className="rounded px-1 py-0.5 text-on-surface-variant hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
        >
          {course.topic}
        </Link>
        <ChevronRight className="w-4 h-4" />
        {lesson ? (
          <Link
            to={getChapterPath(course.id, chapter)}
            className="rounded px-1 py-0.5 text-on-surface-variant hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          >
            {t('course.chapter', { number: chapter.chapter.toString().padStart(2, '0') })}
          </Link>
        ) : (
          <span className="rounded px-1 py-0.5 text-on-surface">{t('course.chapter', { number: chapter.chapter.toString().padStart(2, '0') })}</span>
        )}
        {lesson && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="rounded px-1 py-0.5 text-on-surface">{t('course.lesson', { number: lesson.lesson.toString().padStart(2, '0') })}</span>
          </>
        )}
      </nav>

      <header className="mb-stack-lg">
        <div className="mb-4 inline-flex items-center gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container-low px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {t('course.chapter', { number: chapter.chapter.toString().padStart(2, '0') })}
            {lesson ? ` · ${t('course.lesson', { number: lesson.lesson.toString().padStart(2, '0') })}` : ''} · {duration}
          </span>
        </div>
        <h1 className="font-h1 text-h1 text-on-surface mb-4">{title}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-[720px]">
          {summary}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {chapter.tags.map((tag) => (
            <span key={tag} className="rounded bg-surface-container px-2 py-1 font-label-sm text-[12px] text-on-surface-variant">
              {tag}
            </span>
          ))}
          {lesson?.task && (
            <span className="rounded bg-indigo-50 px-2 py-1 font-label-sm text-[12px] text-indigo-700">
              {t('course.task', { task: lesson.task })}
            </span>
          )}
        </div>
      </header>

      <div className="min-w-0 max-w-content-max">
        {locked ? (
          <>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-primary"><LockKeyhole className="h-3.5 w-3.5" />{copy.preview}</div>
              <MarkdownRenderer markdown={markdown.split('\n').slice(0, 32).join('\n')} />
            </div>
            <section className="mt-7 rounded-2xl border border-primary/30 bg-primary-container/25 p-6 sm:p-8">
              <p className="text-sm font-semibold text-primary">{copy.lockedEyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold text-on-surface">{copy.lockedTitle}</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-on-surface-variant">{copy.lockedBody}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">{copy.login}</Link>
                <Link to="/register" className="rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary">{copy.createAccount}</Link>
              </div>
            </section>
          </>
        ) : <>
        <MarkdownRenderer markdown={markdown} />

        {lesson?.interaction && (
          course.id === 'forward-deployed-engineering'
            ? <FdeInteractiveCourseware course={course} chapter={chapter} lesson={lesson} />
            : <InteractiveCourseware course={course} chapter={chapter} lesson={lesson} />
        )}

        {interactiveLabId && (
          <div className="my-stack-lg">
            <CliLab labId={interactiveLabId} />
          </div>
        )}

        <hr className="border-outline-variant my-stack-lg" />

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          {previous ? (
            <Link
              to={getLessonPath(course.id, previous)}
              className="flex flex-col items-start px-6 py-4 border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container-low transition-all group sm:max-w-[260px] w-full"
            >
              <span className="text-xs text-on-surface-variant mb-1 flex items-center gap-1 group-hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4" /> {t('course.previous')}
              </span>
              <span className="font-medium text-on-surface text-sm truncate w-full">{previous.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {!lesson && firstLesson ? (
            <Link
              to={getLessonPath(course.id, firstLesson)}
              className="flex flex-col items-end text-right px-6 py-4 border border-primary bg-primary text-on-primary rounded-xl hover:opacity-90 transition-all group sm:max-w-[320px] w-full"
            >
              <span className="text-xs opacity-80 mb-1 flex items-center gap-1">
                {t('course.enterFirst')} <ArrowRight className="w-4 h-4" />
              </span>
              <span className="font-medium text-sm truncate w-full text-right">{firstLesson.title}</span>
            </Link>
          ) : next ? (
            <div className="flex w-full flex-col gap-3 sm:max-w-[320px]">
              {lesson && (
                <button
                  type="button"
                  onClick={onCompleteLesson}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/35 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('course.markComplete')}
                </button>
              )}
              <Link
                to={getLessonPath(course.id, next)}
                onClick={onCompleteLesson}
                className="flex flex-col items-end text-right px-6 py-4 border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container-low transition-all group w-full"
              >
                <span className="text-xs text-on-surface-variant mb-1 flex items-center gap-1 group-hover:text-primary transition-colors">
                  {t('course.next')} <ArrowRight className="w-4 h-4" />
                </span>
                <span className="font-medium text-on-surface text-sm truncate w-full text-right">{next.title}</span>
              </Link>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:max-w-[320px]">
              {lesson && (
                <button
                  type="button"
                  onClick={onCompleteLesson}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/35 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('course.completeCourse')}
                </button>
              )}
              <Link
                to="/me/course"
                onClick={onCompleteLesson}
                className="flex flex-col items-end text-right px-6 py-4 border border-primary bg-primary text-on-primary rounded-xl hover:opacity-90 transition-all w-full"
              >
                <span className="text-xs opacity-80 mb-1">{t('course.progress')}</span>
                <span className="font-medium text-sm truncate w-full text-right">{t('course.openDashboard')}</span>
              </Link>
            </div>
          )}
        </div>
        </>}
      </div>
    </main>
  );
}
