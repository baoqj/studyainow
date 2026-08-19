import { ArrowRight, Code2, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getInterviewSetStartPath, skillDisplayName, type InterviewSet } from '../../data/interviewContent';
import { getInterviewCopy } from '../../data/interviewCopy';
import type { AppLocale } from '../../data/courseContent';

export const InterviewCard: React.FC<{ set: InterviewSet }> = ({ set }) => {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getInterviewCopy(locale);
  const startPath = getInterviewSetStartPath(set);

  return (
    <Link
      to={startPath}
      data-interview-set-id={set.id}
      data-testid="interview-set-card"
      className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer group"
    >
      <div className="relative h-44 overflow-hidden">
        {set.coverUrl ? (
          <img
            alt={set.title}
            src={set.coverUrl}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#102a43] via-[#123f5c] to-[#0ea5a4] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <Code2 className="w-16 h-16 text-[#f4c95d] opacity-70" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="rounded bg-surface-container-lowest/90 px-2 py-1 font-label-sm text-[12px] text-on-surface shadow-sm backdrop-blur">
            {set.category}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <span className="text-primary font-label-sm text-[12px] uppercase tracking-wider mb-2">{set.topic}</span>
        <h3 className="font-h3 text-on-surface text-[20px] leading-tight mb-2 group-hover:text-primary transition-colors">{set.title}</h3>
        <p className="font-body-md text-on-surface-variant text-[14px] mb-4 flex-grow line-clamp-2">{set.subtitle}</p>

        <div className="flex flex-wrap gap-1.5 mb-4" aria-label={copy.cardSkills}>
          {set.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-primary/20 bg-primary-container/30 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[10px]" aria-hidden="true">
              Py
            </div>
            <span className="font-label-sm text-[12px] text-on-surface-variant">
              {set.skills.map((skill) => skillDisplayName(skill, locale)).slice(0, 2).join(' · ')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-[12px]">
            <Layers3 className="w-4 h-4" />
            <span>{copy.cardLevelsAndQuestions.replace('{{levels}}', String(set.levelCount)).replace('{{questions}}', String(set.questionCount))}</span>
            <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
  );
};
