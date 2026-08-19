import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Clock, Code2, Globe2, Layers3, ListOrdered } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { DifficultyLadder } from '../components/interview/DifficultyLadder';
import { getInterviewCopy, levelDifficultyLabel } from '../data/interviewCopy';
import { getInterviewLevelPath, getInterviewQuestionPath, getInterviewSet, getInterviewSetStartPath, skillDisplayName } from '../data/interviewContent';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../data/courseContent';

export function InterviewSetStart() {
  const { setId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getInterviewCopy(locale);
  const set = getInterviewSet(setId, locale);
  const startPath = getInterviewSetStartPath(set);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [skillsExceedTwoRows, setSkillsExceedTwoRows] = useState(false);
  const skillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSkillsExpanded(false); }, [set.id]);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [set.id]);

  useLayoutEffect(() => {
    const element = skillsRef.current;
    if (!element) return;
    const measureRows = () => {
      const rowTops = new Set(Array.from(element.children, (child) => (child as HTMLElement).offsetTop));
      setSkillsExceedTwoRows(rowTops.size > 2);
    };
    measureRows();
    const observer = new ResizeObserver(measureRows);
    observer.observe(element);
    return () => observer.disconnect();
  }, [set.id]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <section className="border-b border-outline-variant bg-surface-container-low">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
            <div>
              <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-2 text-label-sm font-label-sm text-outline">
                <Link to="/interviews" className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {copy.breadcrumbSets}
                </Link>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                <span className="rounded px-1 py-0.5 text-on-surface">{set.topic}</span>
              </nav>

              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded bg-surface-container-lowest px-3 py-1 text-[12px] font-label-sm text-on-surface-variant shadow-sm">{set.category}</span>
                <span className="rounded bg-surface-container-lowest px-3 py-1 text-[12px] font-label-sm text-on-surface-variant shadow-sm">
                  {copy.cardLevelsAndQuestions.replace('{{levels}}', String(set.levelCount)).replace('{{questions}}', String(set.questionCount))}
                </span>
              </div>

              <h1 className="font-h1 text-h1 text-on-surface">{set.title}</h1>
              {set.subtitle && <p className="mt-3 text-xl font-semibold text-primary">{set.subtitle}</p>}
              <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">{set.description}</p>

              {set.skills.length > 0 && (
                <div className="mt-5">
                  <div
                    id="interview-set-skill-tags"
                    ref={skillsRef}
                    data-collapsed={skillsExceedTwoRows && !skillsExpanded ? 'true' : 'false'}
                    className={`flex flex-wrap gap-2 ${skillsExceedTwoRows && !skillsExpanded ? 'max-h-7 overflow-hidden' : ''}`}
                    aria-label={copy.skills}
                  >
                    {set.skills.map((skill) => (
                      <span key={skill} className="whitespace-nowrap rounded-full border border-primary/20 bg-primary-container/30 px-3 py-1 text-xs font-semibold text-primary">
                        {skillDisplayName(skill, locale)}
                      </span>
                    ))}
                  </div>
                  {skillsExceedTwoRows && (
                    <button
                      type="button"
                      aria-controls="interview-set-skill-tags"
                      aria-expanded={skillsExpanded}
                      onClick={() => setSkillsExpanded((current) => !current)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary-container/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {skillsExpanded ? copy.collapseAll : copy.revealAll}
                      {skillsExpanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={startPath} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-label-sm text-on-primary hover:bg-primary/90">
                  {copy.startPractice}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href="#levels" className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-5 py-3 text-sm font-label-sm text-on-surface hover:bg-surface-container-low">
                  {copy.viewLevels}
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              {set.coverUrl ? (
                <img src={set.coverUrl} alt={set.title} className="h-72 w-full object-cover" />
              ) : (
                <div className="flex h-72 items-center justify-center bg-[linear-gradient(135deg,#102a43,#0ea5a4)]">
                  <Code2 className="h-16 w-16 text-[#f4c95d]/80" aria-hidden="true" />
                </div>
              )}
              <div className="grid grid-cols-3 divide-x divide-outline-variant">
                <div className="p-4">
                  <Layers3 className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
                  <div className="text-sm font-semibold text-on-surface">{copy.level.replace('{{number}}', `1–${set.levelCount}`)}</div>
                  <div className="text-xs text-on-surface-variant">{copy.outline}</div>
                </div>
                <div className="p-4">
                  <ListOrdered className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
                  <div className="text-sm font-semibold text-on-surface">{copy.questions.replace('{{number}}', String(set.questionCount))}</div>
                  <div className="text-xs text-on-surface-variant">{copy.selfCheck}</div>
                </div>
                <div className="p-4">
                  <Globe2 className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
                  <div className="text-sm font-semibold text-on-surface">5</div>
                  <div className="text-xs text-on-surface-variant">{copy.setLanguages}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="levels" className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-h2 text-h2 text-on-surface">{copy.outline}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{copy.hiddenUntilReveal}</p>
            </div>
            <Link to={startPath} className="hidden text-sm font-label-sm text-primary hover:underline sm:inline">
              {copy.startPractice}
            </Link>
          </div>

          <div className="mb-8">
            <DifficultyLadder set={set} levels={set.levels} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {set.levels.map((level) => (
              <Link
                key={level.id}
                to={getInterviewLevelPath(set.id, level)}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:border-primary hover:bg-surface-container-low"
              >
                <div className="mb-2 flex items-center gap-2 text-[12px] font-label-sm text-primary">
                  <span className="rounded bg-primary-container/40 px-2 py-0.5 font-bold">L{level.number}</span>
                  {levelDifficultyLabel(level.number, locale)} · {copy.questions.replace('{{number}}', String(level.questions.length))}
                </div>
                <h3 className="font-h3 text-[19px] leading-snug text-on-surface">{level.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{level.overview}</p>
                {level.timeBudget && (
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {copy.timeBudget} · {level.timeBudget}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-outline-variant bg-surface-container-low">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-6 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-h2 text-h2 text-on-surface">{copy.toc}</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {set.levels.map((level) => (
                <div key={level.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
                  <Link to={getInterviewLevelPath(set.id, level)} className="mb-3 flex items-center justify-between gap-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                    <span className="font-label-sm text-label-sm text-on-surface">
                      {copy.level.replace('{{number}}', String(level.number))} · {levelDifficultyLabel(level.number, locale)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                  </Link>
                  <ol className="space-y-1 border-l border-outline-variant">
                    {level.questions.map((question) => (
                      <li key={question.id}>
                        <Link
                          to={getInterviewQuestionPath(set.id, question)}
                          className="group -ml-px flex gap-2 border-l-2 border-transparent py-1.5 pl-4 text-sm text-on-surface-variant transition hover:border-primary hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <span className="font-code-block text-[12px] text-primary/70">{level.number}.{question.number}</span>
                          <span className="min-w-0 truncate">{question.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
