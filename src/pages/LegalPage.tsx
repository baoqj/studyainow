import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { getPublicInfoCopy, type LegalDocumentKind } from '../data/publicInfoCopy';
import type { AppLocale } from '../data/courseCatalog';

interface LegalPageProps {
  type: LegalDocumentKind;
}

export function LegalPage({ type }: LegalPageProps) {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const content = getPublicInfoCopy(locale).legal[type];

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
        </section>
      </main>
      <Footer />
    </div>
  );
}
