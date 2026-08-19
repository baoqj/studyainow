import { ArrowLeft, ArrowRight, Clock, Target } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { DifficultyLadder } from '../components/interview/DifficultyLadder';
import { MarkdownRenderer } from '../components/course/MarkdownRenderer';
import { getInterviewCopy, levelDifficultyLabel, readInterviewProgress } from '../data/interviewCopy';
import { getInterviewLevelPath, getInterviewQuestionPath, getInterviewSet, getInterviewSetStartPath, skillDisplayName } from '../data/interviewContent';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../data/courseContent';

export function InterviewLevel() {
  const { setId, levelId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getInterviewCopy(locale);
  const set = getInterviewSet(setId, locale);
  const level = set.levels.find((item) => item.id === levelId || String(item.number) === levelId) ?? set.levels[0];
  const progress = readInterviewProgress()[set.id] ?? {};

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [set.id, level.id]);

  const previousLevel = set.levels.find((item) => item.number === level.number - 1);
  const nextLevel = set.levels.find((item) => item.number === level.number + 1);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <section className="border-b border-outline-variant bg-surface-container-low">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <nav aria-label="breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-label-sm font-label-sm text-outline">
              <Link to="/interviews" className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
                {copy.breadcrumbSets}
              </Link>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              <Link to={getInterviewSetStartPath(set)} className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
                {set.title}
              </Link>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              <span className="rounded px-1 py-0.5 text-on-surface">{copy.level.replace('{{number}}', String(level.number))}</span>
            </nav>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary px-3 py-1 text-[13px] font-bold text-on-primary">L{level.number}</span>
              <span className="rounded bg-surface-container-lowest px-3 py-1 text-[12px] font-label-sm text-on-surface-variant shadow-sm">
                {copy.levelDifficulty}: {levelDifficultyLabel(level.number, locale)}
              </span>
              {level.timeBudget && (
                <span className="inline-flex items-center gap-1.5 rounded bg-surface-container-lowest px-3 py-1 text-[12px] font-label-sm text-on-surface-variant shadow-sm">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {copy.timeBudget} · {level.timeBudget}
                </span>
              )}
            </div>

            <h1 className="font-h1 text-h1 text-on-surface">{level.title}</h1>
            <p className="mt-4 max-w-3xl text-body-lg leading-relaxed text-on-surface-variant">{level.overview}</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <DifficultyLadder set={set} levels={set.levels} currentLevel={level} />
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-label-sm text-label-sm text-on-surface">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                {copy.assesses}
              </h2>
              <ul className="space-y-2">
                {level.assesses.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-on-surface-variant">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section>
            <h2 className="mb-4 font-h2 text-h2 text-on-surface">{copy.questions}</h2>
            <ol className="space-y-3">
              {level.questions.map((question) => {
                const state = progress[question.id];
                const assessment = state?.assessment;
                return (
                  <li key={question.id}>
                    <Link
                      to={getInterviewQuestionPath(set.id, question)}
                      data-testid="interview-question-link"
                      className="group block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:border-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-code-block text-[12px] font-bold text-primary">{level.number}.{question.number}</span>
                        <span className="font-label-sm text-label-sm text-on-surface group-hover:text-primary">{copy.question.replace('{{number}}', String(question.number))}</span>
                        <span className="ml-auto flex items-center gap-2">
                          {assessment === 'got-it' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{copy.gotIt}</span>}
                          {assessment === 'review' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{copy.needsReview}</span>}
                          {!assessment && <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">{copy.notTried}</span>}
                        </span>
                      </div>
                      <h3 className="font-h3 text-[19px] leading-snug text-on-surface">{question.title}</h3>
                      {question.focus && <p className="mt-1 text-sm text-on-surface-variant">{copy.questionFocus}: {question.focus}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {question.skills.map((skill) => (
                          <span key={skill} className="rounded-full border border-primary/20 bg-primary-container/30 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            {skillDisplayName(skill, locale)}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>

            {level.glance && (
              <div className="mt-8">
                <h3 className="mb-3 font-label-sm text-label-sm text-on-surface-variant">{copy.toc}</h3>
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
                  <MarkdownRenderer markdown={level.glance} />
                </div>
              </div>
            )}
          </section>
        </div>

        <nav aria-label={copy.outline} className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 pb-12">
          {previousLevel ? (
            <Link to={getInterviewLevelPath(set.id, previousLevel)} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-label-sm text-on-surface hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {copy.level.replace('{{number}}', String(previousLevel.number))}
            </Link>
          ) : <span aria-hidden="true" />}
          {nextLevel ? (
            <Link to={getInterviewLevelPath(set.id, nextLevel)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-label-sm text-on-primary hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              {copy.level.replace('{{number}}', String(nextLevel.number))} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : <span aria-hidden="true" />}
        </nav>
      </main>
      <Footer />
    </div>
  );
}
