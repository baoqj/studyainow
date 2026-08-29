import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Course } from '../../data/courseContent';
import { useTranslation } from 'react-i18next';
import { LanguageSelect } from '../layout/LanguageSelect';
import { SupportButton } from '../support/SupportButton';
import { BrandWordmark } from '../brand/BrandWordmark';
import { localizedPublicPath } from '../../lib/localeRoutes';
import type { AppLocale } from '../../data/courseContent';

export function CourseNavbar({ course }: { course: Course }) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const catalogPath = localizedPublicPath('/', locale);
  const coursePath = localizedPublicPath(`/courses/${course.id}`, locale);
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm text-sm tracking-tight h-16">
      <div className="flex justify-between items-center h-full px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-8 h-full">
          <Link to={catalogPath} aria-label="Study AI Now!" className="text-xl">
            <BrandWordmark />
          </Link>
          <div className="hidden md:flex gap-6 h-full items-center">
            <Link to={catalogPath} className="text-slate-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm font-label-sm font-medium">
              {t('nav.courses')}
            </Link>
            <Link to={coursePath} className="text-primary font-label-sm font-bold border-b-2 border-primary h-full flex items-center mt-[18px] pb-[18px]">
              {course.topic}
            </Link>
            <Link to={coursePath} className="text-slate-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm font-label-sm font-medium">
              {t('course.outline')}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelect />
          <div className="hidden lg:block">
            <SupportButton />
          </div>
          <button className="text-slate-600 hover:text-slate-900 transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <Link to="/login" className="bg-primary text-white px-4 py-2 rounded-DEFAULT font-label-sm text-label-sm hover:opacity-90 transition-opacity">
            {t('nav.login')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
