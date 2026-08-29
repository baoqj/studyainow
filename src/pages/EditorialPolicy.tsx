import { ClipboardCheck, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { EDITORIAL_POLICY } from '../data/editorialPolicy';
import type { AppLocale } from '../data/courseContent';
import { localizedPublicPath } from '../lib/localeRoutes';

export function EditorialPolicy() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = EDITORIAL_POLICY[locale];

  return <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
    <Navbar />
    <main className="flex-grow pt-16">
      <section className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <nav aria-label="Breadcrumb" className="mb-7 flex items-center gap-2 text-sm text-on-surface-variant"><Link to={localizedPublicPath('/', locale)} className="hover:text-primary hover:underline">Study AI Now!</Link><span aria-hidden="true">/</span><span>{copy.eyebrow}</span></nav>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container/25 px-3 py-1.5 text-sm font-semibold text-primary"><ShieldCheck className="h-4 w-4" />{copy.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">{copy.h1}</h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-on-surface-variant sm:text-xl sm:leading-9">{copy.intro}</p>
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 sm:px-8 md:grid-cols-2 lg:px-10">
        {copy.sections.map((section, index) => <article key={section.heading} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"><p className="text-sm font-semibold text-primary">0{index + 1}</p><h2 className="mt-3 text-2xl font-black tracking-tight">{section.heading}</h2><p className="mt-3 leading-7 text-on-surface-variant">{section.body}</p></article>)}
      </section>
      <section className="mx-auto mb-14 w-full max-w-7xl px-5 sm:px-8 lg:px-10"><div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 sm:p-8"><ClipboardCheck className="h-7 w-7 text-primary" /><h2 className="mt-4 text-2xl font-black tracking-tight">{copy.correctionTitle}</h2><p className="mt-3 max-w-3xl leading-7 text-on-surface-variant">{copy.correctionBody}</p><Link to={localizedPublicPath('/contact', locale)} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary/90"><Mail className="h-4 w-4" />{copy.contactLabel}</Link></div></section>
    </main>
    <Footer />
  </div>;
}
