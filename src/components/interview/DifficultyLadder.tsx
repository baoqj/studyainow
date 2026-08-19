import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getInterviewLevelPath, type InterviewLevel, type InterviewSet } from '../../data/interviewContent';
import { getInterviewCopy, levelDifficultyLabel } from '../../data/interviewCopy';
import type { AppLocale } from '../../data/courseContent';

/** L1→L6 难度进阶阶梯：随级别升高显示更高的难度提示与更深的颜色。 */
export function DifficultyLadder({
  set,
  levels,
  currentLevel,
}: {
  set: InterviewSet;
  levels: InterviewLevel[];
  currentLevel?: InterviewLevel;
}) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getInterviewCopy(locale);
  const steps = [1, 2, 3, 4, 5, 6].map((number) => levels.find((level) => level.number === number));
  const intensity = ['from-[#0ea5a4]/25', 'from-[#0ea5a4]/40', 'from-[#0ea5a4]/55', 'from-[#2c7a7b]/70', 'from-[#28527a]/85', 'from-[#102a43]'];

  return (
    <section aria-label={copy.difficultyLadder} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-label-sm text-label-sm text-on-surface">{copy.difficultyLadder}</h3>
        <span className="text-[12px] text-on-surface-variant">{t('filter.advanced')} →</span>
      </div>
      <div className="flex items-end gap-1.5" role="list" aria-label={copy.difficultyLadder}>
        {steps.map((level, index) => {
          const isCurrent = currentLevel && level && level.number === currentLevel.number;
          if (!level) return null;
          const height = 28 + index * 9;
          return (
            <Link
              key={level.id}
              to={getInterviewLevelPath(set.id, level)}
              role="listitem"
              aria-label={`${copy.level.replace('{{number}}', String(level.number))} · ${levelDifficultyLabel(level.number, locale)}`}
              title={levelDifficultyLabel(level.number, locale)}
              className={`group flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg border px-1 py-2 transition-colors ${
                isCurrent ? 'border-primary bg-primary-container/25' : 'border-outline-variant hover:border-primary/50'
              }`}
            >
              <span
                className={`w-full rounded bg-gradient-to-t ${intensity[index]} text-center text-[11px] font-bold text-white transition-transform group-hover:-translate-y-0.5`}
                style={{ height: `${height}px`, lineHeight: `${height}px` }}
              >
                L{level.number}
              </span>
              <span className={`w-full truncate text-center text-[11px] font-semibold ${isCurrent ? 'text-primary' : 'text-on-surface-variant'}`}>
                {levelDifficultyLabel(level.number, locale)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
