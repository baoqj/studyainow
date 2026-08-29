import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { getPublicInfoCopy, type LegalDocumentKind } from '../data/publicInfoCopy';
import type { AppLocale } from '../data/courseCatalog';

interface LegalPageProps {
  type: LegalDocumentKind;
}

const advertisingResources: Record<AppLocale, { title: string; partnerSites: string; adsSettings: string; privacy: string }> = {
  'zh-CN': { title: 'Google 广告资源', partnerSites: 'Google 如何使用合作伙伴网站的信息', adsSettings: 'Google 广告设置', privacy: 'Google 隐私权政策' },
  'zh-TW': { title: 'Google 廣告資源', partnerSites: 'Google 如何使用合作夥伴網站的資訊', adsSettings: 'Google 廣告設定', privacy: 'Google 隱私權政策' },
  en: { title: 'Google advertising resources', partnerSites: 'How Google uses information from partner sites', adsSettings: 'Google Ads Settings', privacy: 'Google Privacy Policy' },
  fr: { title: 'Ressources publicitaires Google', partnerSites: 'Utilisation des informations issues des sites partenaires par Google', adsSettings: 'Paramètres des annonces Google', privacy: 'Règles de confidentialité de Google' },
  es: { title: 'Recursos publicitarios de Google', partnerSites: 'Cómo usa Google la información de sitios asociados', adsSettings: 'Configuración de anuncios de Google', privacy: 'Política de privacidad de Google' },
};

export function LegalPage({ type }: LegalPageProps) {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const content = getPublicInfoCopy(locale).legal[type];
  const resources = advertisingResources[locale] ?? advertisingResources.en;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
            <Link to="/" className="text-sm font-semibold text-primary hover:underline">
              {content.home}
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Study AI Now!</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-on-surface sm:text-5xl">{content.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-on-surface-variant">{content.subtitle}</p>
            <p className="mt-3 text-sm text-outline">{content.updated}</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl space-y-4 px-5 py-10 sm:px-8">
          {content.sections.map((section) => (
            <article key={section.heading} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <h2 className="text-xl font-black tracking-tight text-on-surface">{section.heading}</h2>
              <p className="mt-3 text-base leading-8 text-on-surface-variant">{section.body}</p>
            </article>
          ))}
          {type === 'privacy' && (
            <aside className="rounded-xl border border-primary/25 bg-primary-container/20 p-6">
              <h2 className="text-xl font-black tracking-tight text-on-surface">{resources.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6">
                <li><a className="font-semibold text-primary hover:underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">{resources.partnerSites}</a></li>
                <li><a className="font-semibold text-primary hover:underline" href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">{resources.adsSettings}</a></li>
                <li><a className="font-semibold text-primary hover:underline" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">{resources.privacy}</a></li>
              </ul>
            </aside>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
