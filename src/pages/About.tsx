import { BookOpen, BriefcaseBusiness, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { getPublicInfoCopy } from '../data/publicInfoCopy';
import type { AppLocale } from '../data/courseCatalog';

const productIcons = [BookOpen, BriefcaseBusiness, FileText] as const;

export function About() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getPublicInfoCopy(locale).about;
  const productCards = [
    { title: copy.coursesTitle, body: copy.coursesBody, action: copy.coursesAction, to: '/courses' },
    { title: copy.jobsTitle, body: copy.jobsBody, action: copy.jobsAction, to: '/jobs' },
    { title: copy.resumeTitle, body: copy.resumeBody, action: copy.resumeAction, to: '/resume' },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-container/30 px-3 py-1.5 text-sm font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                {copy.eyebrow}
              </p>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-on-surface sm:text-6xl">{copy.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-on-surface-variant sm:text-xl sm:leading-9">{copy.intro}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-10 sm:px-8 md:grid-cols-3 lg:px-10">
          {copy.principles.map((principle, index) => (
            <article key={principle.heading} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <p className="text-sm font-semibold text-primary">0{index + 1}</p>
              <h2 className="mt-4 text-xl font-black tracking-tight text-on-surface">{principle.heading}</h2>
              <p className="mt-3 leading-7 text-on-surface-variant">{principle.body}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-14 sm:px-8 lg:grid-cols-3 lg:px-10">
          {productCards.map((card, index) => {
            const Icon = productIcons[index];
            return (
              <article key={card.to} className="flex min-h-72 flex-col rounded-2xl border border-outline-variant bg-surface-container-low p-6">
                <Icon className="h-7 w-7 text-primary" />
                <h2 className="mt-5 text-2xl font-black tracking-tight text-on-surface">{card.title}</h2>
                <p className="mt-3 flex-grow leading-7 text-on-surface-variant">{card.body}</p>
                <Link to={card.to} className="mt-7 inline-flex w-fit rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90">
                  {card.action}
                </Link>
              </article>
            );
          })}
        </section>
      </main>
      <Footer />
    </div>
  );
}
