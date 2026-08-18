import { useTranslation } from 'react-i18next';
import { SupportButton } from '../support/SupportButton';
import { Link } from 'react-router-dom';
import { getPublicInfoCopy } from '../../data/publicInfoCopy';
import type { AppLocale } from '../../data/courseCatalog';

export function Footer() {
  const { t, i18n } = useTranslation();
  const copy = getPublicInfoCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);

  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="font-bold text-outline font-label-sm text-xs">
          © 2026 Study AI Now!
        </div>
        <nav className="flex flex-wrap gap-6">
          <SupportButton variant="link" />
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to="/courses">
            {t('footer.catalog')}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to="/jobs">
            {t('nav.jobs')}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to="/about">
            {copy.footer.about}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to="/contact">
            {copy.footer.contact}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to="/privacy">
            {t('footer.privacy')}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to="/terms">
            {t('footer.terms')}
          </Link>
          <a className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" href="mailto:studyainow@mail.com">
            studyainow@mail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
