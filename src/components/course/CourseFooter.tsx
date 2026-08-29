import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandWordmark } from '../brand/BrandWordmark';
import { getPublicInfoCopy } from '../../data/publicInfoCopy';
import type { AppLocale } from '../../data/courseCatalog';
import { localizedPublicPath } from '../../lib/localeRoutes';

export function CourseFooter() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getPublicInfoCopy(locale);
  return (
    <footer className="bg-white w-full py-12 mt-20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <BrandWordmark className="text-lg" />
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-slate-500">
          <Link to={localizedPublicPath('/', locale)} className="hover:text-slate-900 transition-colors">{t('footer.catalog')}</Link>
          <Link to={localizedPublicPath('/jobs', locale)} className="hover:text-slate-900 transition-colors">{t('nav.jobs')}</Link>
          <Link to={localizedPublicPath('/privacy', locale)} className="hover:text-slate-900 transition-colors">{t('footer.privacy')}</Link>
          <Link to={localizedPublicPath('/terms', locale)} className="hover:text-slate-900 transition-colors">{t('footer.terms')}</Link>
          <Link to={localizedPublicPath('/about', locale)} className="hover:text-slate-900 transition-colors">{copy.footer.about}</Link>
          <Link to={localizedPublicPath('/contact', locale)} className="hover:text-slate-900 transition-colors">{copy.footer.contact}</Link>
          <Link to={localizedPublicPath('/editorial-policy', locale)} className="hover:text-slate-900 transition-colors">{locale === 'zh-CN' ? '编辑政策' : locale === 'zh-TW' ? '編輯政策' : locale === 'fr' ? 'Politique éditoriale' : locale === 'es' ? 'Política editorial' : 'Editorial policy'}</Link>
        </div>
        <div className="text-xs text-slate-500">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
