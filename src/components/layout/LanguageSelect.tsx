import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_LOCALES } from '../../i18n';

const LANGUAGES = APP_LOCALES;

export function LanguageSelect() {
  const { t, i18n } = useTranslation();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface-variant shadow-sm">
      <Globe className="h-4 w-4" />
      <span className="sr-only">{t('Language')}</span>
      <select
        value={i18n.language}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value);
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
