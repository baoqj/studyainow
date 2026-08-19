import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Code2, Eye, EyeOff, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { RevealSection } from '../components/interview/RevealSection';
import { DifficultyLadder } from '../components/interview/DifficultyLadder';
import { MarkdownRenderer } from '../components/course/MarkdownRenderer';
import { clearInterviewProgress, getInterviewCopy, levelDifficultyLabel, readInterviewProgress, writeInterviewProgress } from '../data/interviewCopy';
import {
  getInterviewLevelPath,
  getInterviewQuestion,
  getInterviewQuestionPath,
  getInterviewSet,
  getInterviewSetStartPath,
  getQuestionNeighbors,
  getQuestionPosition,
  skillDisplayName,
} from '../data/interviewContent';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../data/courseContent';

const SECTION_IDS = ['hint', 'mistakes', 'solution', 'summary'] as const;
type SectionId = (typeof SECTION_IDS)[number];

export function InterviewQuestion() {
  const { setId, levelId, questionId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getInterviewCopy(locale);
  const set = getInterviewSet(setId, locale);
  const level = set.levels.find((item) => item.id === levelId || String(item.number) === levelId) ?? set.levels[0];
  const question = getInterviewQuestion(level, questionId) ?? level.questions[0];
  const { previous, next } = getQuestionNeighbors(set, question);
  const position = getQuestionPosition(set, question);

  const [revealed, setRevealed] = useState<string[]>([]);
  const [assessment, setAssessment] = useState<'got-it' | 'review' | undefined>(undefined);

  // 从 localStorage 恢复本机练习进度
  useEffect(() => {
    if (!question) return;
    const state = readInterviewProgress()[set.id]?.[question.id];
    setRevealed(state?.revealed ?? []);
    setAssessment(state?.assessment);
  }, [set.id, question?.id]);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [set.id, level.id, question?.id]);

  const persist = (nextRevealed: string[], nextAssessment?: 'got-it' | 'review') => {
    const progress = readInterviewProgress();
    const setProgress = progress[set.id] ?? {};
    setProgress[question.id] = { revealed: nextRevealed, ...(nextAssessment ? { assessment: nextAssessment } : {}) };
    progress[set.id] = setProgress;
    writeInterviewProgress(progress);
  };

  const toggleSection = (section: SectionId) => {
    setRevealed((current) => {
      const next = current.includes(section) ? current.filter((item) => item !== section) : [...current, section];
      persist(next, assessment);
      return next;
    });
  };

  const revealAll = () => {
    const next = [...SECTION_IDS];
    setRevealed(next);
    persist(next, assessment);
  };

  const collapseAll = () => {
    setRevealed([]);
    persist([], assessment);
  };

  const resetProgress = () => {
    clearInterviewProgress();
    setRevealed([]);
    setAssessment(undefined);
  };

  const chooseAssessment = (value: 'got-it' | 'review') => {
    setAssessment(value);
    persist(revealed, value);
  };

  const allRevealed = useMemo(() => SECTION_IDS.every((section) => revealed.includes(section)), [revealed]);

  if (!question) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-2 pt-6 text-label-sm font-label-sm text-outline">
            <Link to="/interviews" className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
              {copy.breadcrumbSets}
            </Link>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <Link to={getInterviewSetStartPath(set)} className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
              {set.title}
            </Link>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <Link to={getInterviewLevelPath(set.id, level)} className="rounded px-1 py-0.5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
              {copy.level.replace('{{number}}', String(level.number))}
            </Link>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span className="rounded px-1 py-0.5 text-on-surface">{copy.question.replace('{{number}}', String(question.number))}</span>
          </nav>
        </div>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
          <article className="min-w-0 flex-1 space-y-6">
            {/* 题头：位置、难度与技能 */}
            <header className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded bg-primary px-3 py-1 text-[13px] font-bold text-on-primary">L{level.number}</span>
                <span className="rounded bg-surface-container px-2 py-1 text-[12px] font-label-sm text-on-surface-variant">
                  {copy.levelDifficulty}: {levelDifficultyLabel(level.number, locale)}
                </span>
                <span className="rounded bg-surface-container px-2 py-1 text-[12px] font-label-sm text-on-surface-variant">
                  {copy.questionPosition.replace('{{index}}', String(position.index)).replace('{{total}}', String(position.total))}
                </span>
              </div>
              <h1 className="font-h2 text-h2 text-on-surface">{copy.question.replace('{{number}}', String(question.number))} — {question.title}</h1>
              {question.focus && (
                <p className="mt-2 text-sm text-on-surface-variant">{copy.questionFocus}: {question.focus}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {question.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-primary/20 bg-primary-container/30 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {skillDisplayName(skill, locale)}
                  </span>
                ))}
              </div>
            </header>

            {/* 题目：始终可见 */}
            <section aria-label={copy.problemStatement} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <h2 className="mb-4 font-label-sm text-[12px] uppercase tracking-[0.14em] text-primary">{copy.problemStatement}</h2>
              <MarkdownRenderer markdown={question.statement} />
              {question.requirements && (
                <>
                  <h2 className="mb-4 mt-8 font-label-sm text-[12px] uppercase tracking-[0.14em] text-primary">{copy.requirements}</h2>
                  <MarkdownRenderer markdown={question.requirements} />
                </>
              )}
              {question.example && (
                <>
                  <h2 className="mb-4 mt-8 font-label-sm text-[12px] uppercase tracking-[0.14em] text-primary">{copy.example}</h2>
                  <MarkdownRenderer markdown={question.example} />
                </>
              )}
            </section>

            {/* 隐藏内容：先做再看 */}
            <section aria-label={copy.hiddenUntilReveal} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <EyeOff className="h-4 w-4 text-primary" aria-hidden="true" />
                  {copy.hiddenUntilReveal} · {copy.tryFirst}
                </p>
                <span className="text-[12px] text-on-surface-variant">
                  {copy.revealCount.replace('{{count}}', String(revealed.length)).replace('{{total}}', String(SECTION_IDS.length))}
                </span>
              </div>

              <RevealSection
                id="interview-hint"
                title={copy.hint}
                icon={<Lightbulb className="h-4 w-4" aria-hidden="true" />}
                content={question.analysis || copy.hint}
                open={revealed.includes('hint')}
                onToggle={() => toggleSection('hint')}
                labelOpen={copy.hideHint}
                labelClosed={copy.showHint}
              />
              <RevealSection
                id="interview-mistakes"
                title={copy.mistakes}
                icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                content={question.mistakes}
                open={revealed.includes('mistakes')}
                onToggle={() => toggleSection('mistakes')}
                labelOpen={copy.hideMistakes}
                labelClosed={copy.showMistakes}
              />
              <RevealSection
                id="interview-solution"
                title={copy.solution}
                icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                content={question.solution}
                open={revealed.includes('solution')}
                onToggle={() => toggleSection('solution')}
                labelOpen={copy.hideSolution}
                labelClosed={copy.showSolution}
              />
              <RevealSection
                id="interview-summary"
                title={copy.summary}
                icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                content={question.summary}
                open={revealed.includes('summary')}
                onToggle={() => toggleSection('summary')}
                labelOpen={copy.hideSummary}
                labelClosed={copy.showSummary}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={allRevealed ? collapseAll : revealAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 px-3 py-2 text-[12px] font-semibold text-primary transition hover:bg-primary-container/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {allRevealed ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  {allRevealed ? copy.collapseAll : copy.revealAll}
                </button>
                <button
                  type="button"
                  onClick={resetProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-[12px] font-semibold text-on-surface-variant transition hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {copy.resetProgress}
                </button>
              </div>
              <p className="text-[12px] text-on-surface-variant">{copy.progressHint}</p>
            </section>

            {/* 解后自评 */}
            <section aria-label={copy.selfCheck} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
              <h2 className="mb-3 font-label-sm text-label-sm text-on-surface">{copy.selfCheck}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={assessment === 'got-it'}
                  onClick={() => chooseAssessment('got-it')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    assessment === 'got-it'
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'border-outline-variant text-on-surface-variant hover:border-emerald-600/60'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {copy.gotIt}
                </button>
                <button
                  type="button"
                  aria-pressed={assessment === 'review'}
                  onClick={() => chooseAssessment('review')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    assessment === 'review'
                      ? 'border-amber-600 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'border-outline-variant text-on-surface-variant hover:border-amber-600/60'
                  }`}
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {copy.needsReview}
                </button>
              </div>
            </section>

            {/* 上下题导航 */}
            <nav aria-label={copy.questions} className="flex items-center justify-between gap-3 border-t border-outline-variant pt-6">
              {previous ? (
                <Link to={getInterviewQuestionPath(set.id, previous)} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-label-sm text-on-surface hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {copy.previous}
                </Link>
              ) : (
                <Link to={getInterviewLevelPath(set.id, level)} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-label-sm text-on-surface hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {copy.backToLevel.replace('{{number}}', String(level.number))}
                </Link>
              )}
              {next ? (
                <Link to={getInterviewQuestionPath(set.id, next)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-label-sm text-on-primary hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  {copy.next} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link to={getInterviewLevelPath(set.id, level)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-label-sm text-on-primary hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  {copy.backToLevel.replace('{{number}}', String(level.number))} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </nav>
          </article>

          {/* 右侧：本级别题目目录 */}
          <aside className="w-full shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-24 space-y-6">
              <DifficultyLadder set={set} levels={set.levels} currentLevel={level} />
              <nav aria-label={copy.toc} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
                <h2 className="mb-3 font-label-sm text-label-sm text-on-surface">{copy.toc}</h2>
                <ol className="space-y-0.5">
                  {level.questions.map((item) => {
                    const isCurrent = item.id === question.id;
                    return (
                      <li key={item.id}>
                        <Link
                          to={getInterviewQuestionPath(set.id, item)}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            isCurrent ? 'bg-primary-container/30 font-semibold text-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                          }`}
                        >
                          <span className="font-code-block text-[11px] text-primary/70">{level.number}.{item.number}</span>
                          <span className="min-w-0 truncate">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
