import type { ArticleHeading } from './MarkdownRenderer';
import { useTranslation } from 'react-i18next';

export function TOC({ headings }: { headings: ArticleHeading[] }) {
  const { t } = useTranslation();
  return (
    <aside className="w-64 flex-shrink-0 hidden xl:block py-12 pr-8 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
      <h5 className="font-label-sm text-label-sm text-slate-900 uppercase tracking-wider mb-4">{t('course.pageContents')}</h5>
      <nav className="flex flex-col space-y-3 border-l border-slate-200">
        {headings.map((heading, index) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`border-l-2 transition-colors -ml-[1px] ${
              index === 0
                ? 'border-indigo-600 text-indigo-600 font-medium'
                : 'border-transparent text-slate-500 hover:border-indigo-600 hover:text-indigo-600'
            } ${heading.level === 3 ? 'pl-6 text-sm' : 'pl-4 text-sm'}`}
          >
            {heading.text.replace(/^\d+\.\s*/, '')}
          </a>
        ))}
      </nav>
    </aside>
  );
}
