import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandWordmark } from '../brand/BrandWordmark';
import { getPublicInfoCopy } from '../../data/publicInfoCopy';
import type { AppLocale } from '../../data/courseCatalog';

export function CourseFooter() {
  const { t, i18n } = useTranslation();
  const copy = getPublicInfoCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  return (
    <footer className="bg-white w-full py-12 mt-20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <BrandWordmark className="text-lg" />
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-slate-500">
          <Link to="/courses" className="hover:text-slate-900 transition-colors">{t('footer.catalog')}</Link>
          <Link to="/jobs" className="hover:text-slate-900 transition-colors">{t('nav.jobs')}</Link>
          <Link to="/privacy" className="hover:text-slate-900 transition-colors">{t('footer.privacy')}</Link>
          <Link to="/terms" className="hover:text-slate-900 transition-colors">{t('footer.terms')}</Link>
          <Link to="/about" className="hover:text-slate-900 transition-colors">{copy.footer.about}</Link>
          <Link to="/contact" className="hover:text-slate-900 transition-colors">{copy.footer.contact}</Link>
        </div>
        <div className="text-xs text-slate-500">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
