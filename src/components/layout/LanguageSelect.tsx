import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_LOCALES } from '../../i18n';
import { localePathForCurrentRoute, type PublicLocale } from '../../lib/localeRoutes';

const LANGUAGES = APP_LOCALES;

export function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface-variant shadow-sm">
      <Globe className="h-4 w-4" />
      <span className="sr-only">{t('Language')}</span>
      <select
        value={i18n.language}
        onChange={(event) => {
          const locale = event.target.value as PublicLocale;
          void i18n.changeLanguage(locale);
          const pathname = localePathForCurrentRoute(location.pathname, locale);
          if (pathname !== location.pathname) navigate({ pathname, search: location.search, hash: location.hash });
        }}
        className="bg-transparent text-sm font-medium text-on-surface outline-none"
        aria-label={t('Language')}
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
