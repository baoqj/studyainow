import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Circle, FileText, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getChapterPath, getLessonPath, type Chapter, type Course, type Lesson } from '../../data/courseContent';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';

export function SidebarNavigation({
  course,
  currentChapter,
  currentLesson,
  mode = 'desktop',
  onNavigate,
  lockedChapterNumbers = new Set<number>(),
}: {
  course: Course;
  currentChapter: Chapter;
  currentLesson?: Lesson;
  mode?: 'desktop' | 'drawer';
  onNavigate?: () => void;
  lockedChapterNumbers?: Set<number>;
}) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const [openChapterId, setOpenChapterId] = useState(currentChapter.routeId);
  const isDrawer = mode === 'drawer';

  useEffect(() => {
    setOpenChapterId(currentChapter.routeId);
  }, [currentChapter.routeId]);

  return (
    <aside
      className={`flex-shrink-0 overflow-y-auto bg-slate-50 border-r border-slate-200 flex flex-col py-8 text-sm font-medium leading-relaxed ${
        isDrawer ? 'h-full w-full' : 'w-64 h-[calc(100vh-64px)] sticky top-16 left-0 hidden lg:flex'
      }`}
    >
      <div className="px-6 mb-6">
        <h2 className="text-lg font-bold text-slate-800">{course.title}</h2>
        <p className="text-slate-500 mt-1 text-sm">
          {t('course.chapterAndLessons', { chapters: course.chapters.length, lessons: course.lessons })}
        </p>
      </div>

      <nav className="flex flex-col gap-1" aria-label={t('course.outline')}>
        {course.chapters.map((chapter) => {
          const isActiveChapter = chapter.routeId === currentChapter.routeId;
          const isOpen = isActiveChapter || openChapterId === chapter.routeId;
          const isDone = chapter.chapter < currentChapter.chapter;
          const isLocked = lockedChapterNumbers.has(chapter.chapter);
          const ChapterIcon = isLocked ? LockKeyhole : isDone ? CheckCircle2 : isActiveChapter ? BookOpen : Circle;
          const ExpandIcon = isOpen ? ChevronDown : ChevronRight;

          return (
            <div
              key={chapter.routeId}
              onMouseEnter={() => setOpenChapterId(chapter.routeId)}
              onMouseLeave={() => {
                if (!isActiveChapter) {
                  setOpenChapterId(currentChapter.routeId);
                }
              }}
              onFocusCapture={() => setOpenChapterId(chapter.routeId)}
              onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(nextTarget) && !isActiveChapter) {
                  setOpenChapterId(currentChapter.routeId);
                }
              }}
              className="mx-2"
            >
              <Link
                to={getChapterPath(course.id, chapter, locale)}
                onClick={onNavigate}
                className={`flex items-start gap-3 rounded-lg px-3 py-3 transition-all ${
                  isActiveChapter
                    ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'
                }`}
                aria-expanded={isOpen}
              >
                <ChapterIcon className={`mt-0.5 h-5 w-5 shrink-0 ${isActiveChapter ? 'text-indigo-600' : ''}`} />
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2">{chapter.title.replace(/^\d+\.\s*/, '')}</span>
                  <span className="mt-1 block text-xs text-slate-400">{t('course.lessons', { count: chapter.lessons.length })}</span>
                </span>
                <ExpandIcon className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </Link>

              {isOpen && chapter.lessons.length > 0 && (
                <div className="ml-8 mr-1 mt-1 flex flex-col border-l border-slate-200 pb-2 pl-3">
                  {chapter.lessons.map((lesson) => {
                    const isActiveLesson = currentLesson?.routeId === lesson.routeId;
                    const isLessonDone =
                      chapter.chapter < currentChapter.chapter ||
                      (isActiveChapter && currentLesson ? lesson.lesson < currentLesson.lesson : false);
                    const LessonIcon = isLocked ? LockKeyhole : isLessonDone ? CheckCircle2 : isActiveLesson ? FileText : Circle;

                    return (
                      <Link
                        key={lesson.routeId}
                        to={getLessonPath(course.id, lesson, locale)}
                        onClick={onNavigate}
                        className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs transition-colors ${
                          isActiveLesson
                            ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                            : 'text-slate-500 hover:bg-white hover:text-indigo-600'
                        }`}
                      >
                        <LessonIcon
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            isActiveLesson ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="line-clamp-2">{lesson.title.replace(/^\d{2}-\d{2}\.\s*/, '')}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
