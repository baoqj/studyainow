import { ArrowRight, BookOpen, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { getCourseSeoCopy } from '../data/courseSeo';
import { TOPIC_SEO, isTopicSeoSlug } from '../data/topicSeo';
import type { AppLocale } from '../data/courseContent';
import { localizedPublicPath } from '../lib/localeRoutes';
import { NotFound } from './NotFound';

export function TopicHub() {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;

  if (!isTopicSeoSlug(topicSlug)) return <NotFound />;

  const topic = TOPIC_SEO[topicSlug];
  const copy = topic.copy[locale];

  return (
    <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
      <Navbar />
      <main className="flex-grow pt-16">
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
            <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <Link to={localizedPublicPath('/', locale)} className="hover:text-primary hover:underline">Study AI Now!</Link>
              <span aria-hidden="true">/</span>
              <span>{copy.eyebrow}</span>
            </nav>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container/25 px-3 py-1.5 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {copy.eyebrow}
            </p>
            <h1 className="mt-5 max-w-5xl text-4xl font-black tracking-tight text-on-surface sm:text-5xl lg:text-6xl">{copy.h1}</h1>
            <p className="mt-6 max-w-4xl text-lg leading-8 text-on-surface-variant sm:text-xl sm:leading-9">{copy.intro}</p>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:px-10">
          <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-on-surface">{copy.courseLabel}</h2>
            <div className="mt-5 grid gap-3">
              {topic.courseIds.map((courseId) => {
                const course = getCourseSeoCopy(courseId, locale);
                if (!course) return null;
                return (
                  <Link key={courseId} to={localizedPublicPath(`/courses/${courseId}`, locale)} className="group rounded-xl border border-outline-variant bg-surface-container-low p-5 transition hover:border-primary hover:bg-primary-container/15">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-primary">{course.topic}</p>
                        <h3 className="mt-1 text-xl font-black tracking-tight text-on-surface">{course.title}</h3>
                        <p className="mt-2 leading-7 text-on-surface-variant">{course.description}</p>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>

          <aside className="h-fit rounded-2xl border border-outline-variant bg-surface-container-low p-6">
            <BookOpen className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-xl font-black tracking-tight text-on-surface">{copy.audience}</h2>
            <ul className="mt-5 space-y-4">
              {copy.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3 text-sm leading-6 text-on-surface-variant">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
            <Link to={localizedPublicPath(topic.interviewPath, locale)} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary/90">
              {copy.interviewLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black tracking-tight text-on-surface">{copy.faqLabel}</h2>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {copy.faqs.map((faq) => (
                <article key={faq.question}>
                  <h3 className="text-lg font-bold text-on-surface">{faq.question}</h3>
                  <p className="mt-2 leading-7 text-on-surface-variant">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
