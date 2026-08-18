import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HeroSection({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <section className="bg-surface-container-low py-stack-lg border-b border-outline-variant">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <h1 className="font-h1 text-h1 text-on-surface mb-stack-sm max-w-[800px]">
          {t('catalog.hero.title')}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-md max-w-content-max">
          {t('catalog.hero.body')}
        </p>
        <div className="relative w-full max-w-[600px] shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-6 h-6" />
          <input
            aria-label={t('catalog.search')}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-12 pr-32 py-4 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('catalog.search')}
            type="text"
            value={query}
          />
          <button type="button" onClick={() => onQueryChange(query.trim())} className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-on-primary font-label-sm text-label-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            {t('catalog.searchButton')}
          </button>
        </div>
      </div>
    </section>
  );
}
