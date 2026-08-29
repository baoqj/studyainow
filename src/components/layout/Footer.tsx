import { useTranslation } from 'react-i18next';
import { SupportButton } from '../support/SupportButton';
import { Link } from 'react-router-dom';
import { getPublicInfoCopy } from '../../data/publicInfoCopy';
import type { AppLocale } from '../../data/courseCatalog';
import { localizedPublicPath } from '../../lib/localeRoutes';
import { TOPIC_SEO_SLUGS } from '../../data/topicSeo';

export function Footer() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getPublicInfoCopy(locale);

  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="font-bold text-outline font-label-sm text-xs">
          © 2026 Study AI Now!
        </div>
        <nav className="flex flex-wrap gap-6">
          <SupportButton variant="link" />
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath('/', locale)}>
            {t('footer.catalog')}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath('/jobs', locale)}>
            {t('nav.jobs')}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath('/about', locale)}>
            {copy.footer.about}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath('/contact', locale)}>
            {copy.footer.contact}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath('/editorial-policy', locale)}>
            {locale === 'zh-CN' ? '编辑政策' : locale === 'zh-TW' ? '編輯政策' : locale === 'fr' ? 'Politique éditoriale' : locale === 'es' ? 'Política editorial' : 'Editorial policy'}
          </Link>
          {TOPIC_SEO_SLUGS.map((slug) => (
            <Link key={slug} className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath(`/topics/${slug}`, locale)}>
              {slug === 'claude-code' ? 'Claude Code' : slug === 'openai-codex' ? 'OpenAI Codex' : slug === 'agent-engineering' ? 'AI Agent' : 'FDE'}
            </Link>
          ))}
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath('/privacy', locale)}>
            {t('footer.privacy')}
          </Link>
          <Link className="font-label-sm text-xs text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-all" to={localizedPublicPath('/terms', locale)}>
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
