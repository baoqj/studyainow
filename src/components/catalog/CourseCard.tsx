import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getCatalogCourseStartPath, resolveCatalogCourseCover, type CatalogCourse, type CourseDifficulty } from '../../data/courseCatalog';
import { useTheme } from '../../lib/theme';

export type CourseData = CatalogCourse;

export const CourseCard: React.FC<{ course: CourseData }> = ({ course }) => {
  const { t } = useTranslation();
  const isDark = useTheme();
  const coursePath = getCatalogCourseStartPath(course);
  const imageUrl = resolveCatalogCourseCover(course.id, isDark, course.imageUrl);
  const isPublished = ['已上线', '已上線', 'Published', 'Publié', 'Publicado'].includes(course.status ?? '');
  const chapterCount = course.chapters;

  return (
    <Link
      to={coursePath}
      data-course-id={course.id}
      data-testid="course-card"
      className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer group"
    >
      <div className="relative h-48 overflow-hidden">
        {imageUrl ? (
          <img
            alt={course.title}
            src={imageUrl}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-tint to-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
             <span className="text-white text-[64px] opacity-50 font-code-block">{'{ }'}</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`font-label-sm text-[12px] px-2 py-1 rounded shadow-sm ${course.difficulty === 'Advanced' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest/90 backdrop-blur text-on-surface'}`}>
            {course.difficulty === 'Beginner' ? t('filter.beginner') : course.difficulty === 'Intermediate' ? t('filter.intermediate') : t('filter.advanced')}
          </span>
          {course.status && (
            <span className="rounded bg-surface-container-lowest/90 px-2 py-1 font-label-sm text-[12px] text-on-surface shadow-sm backdrop-blur">
              {course.status}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <span className="text-primary font-label-sm text-[12px] uppercase tracking-wider mb-2">{course.topic}</span>
        <h3 className="font-h3 text-on-surface text-[20px] leading-tight mb-2 group-hover:text-primary transition-colors">{course.title}</h3>
        <p className="font-body-md text-on-surface-variant text-[14px] mb-4 flex-grow">{course.description}</p>
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[10px]">
              {course.authorIconText}
            </div>
            <span className="font-label-sm text-[12px] text-on-surface-variant">{course.authorDomain}</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-[12px]">
             <BookOpen className="w-4 h-4" />
            <span>{isPublished ? t('course.chapterAndLessons', { chapters: chapterCount, lessons: course.lessons }) : t('course.lessons', { count: course.lessons })}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
