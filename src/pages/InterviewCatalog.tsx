import { useCallback, useMemo, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { InterviewCard } from '../components/interview/InterviewCard';
import { InterviewFiltersSidebar, type InterviewFilterOption } from '../components/interview/InterviewFiltersSidebar';
import { InterviewMobileFiltersDrawer } from '../components/interview/InterviewMobileFiltersDrawer';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getInterviewSets } from '../data/interviewContent';
import { getInterviewCopy } from '../data/interviewCopy';
import type { AppLocale } from '../data/courseContent';

export function InterviewCatalog() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getInterviewCopy(locale);
  const sets = getInterviewSets(locale);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const allTags = useMemo<InterviewFilterOption[]>(
    () =>
      Array.from(new Set(sets.flatMap((set) => set.tags))).sort().map((tag) => ({
        value: tag,
        label: tag,
        count: sets.filter((set) => set.tags.includes(tag)).length,
      })),
    [sets],
  );
  const allCategories = useMemo<InterviewFilterOption[]>(
    () =>
      Array.from(new Set(sets.map((set) => set.category))).sort().map((category) => ({
        value: category,
        label: category,
        count: sets.filter((set) => set.category === category).length,
      })),
    [sets],
  );
  const allKeywords = useMemo<InterviewFilterOption[]>(
    () =>
      Array.from(new Set(sets.flatMap((set) => set.keywords))).sort().map((keyword) => ({
        value: keyword,
        label: keyword,
        count: sets.filter((set) => set.keywords.includes(keyword)).length,
      })),
    [sets],
  );

  const filteredSets = useMemo(
    () =>
      sets.filter((set) => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const searchable = [set.title, set.subtitle, set.description, set.topic, set.category, ...set.tags, ...set.keywords].join(' ').toLocaleLowerCase();
        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
        const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => set.tags.includes(tag));
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(set.category);
        const matchesKeywords = selectedKeywords.length === 0 || selectedKeywords.some((keyword) => set.keywords.includes(keyword));
        return matchesQuery && matchesTags && matchesCategory && matchesKeywords;
      }),
    [sets, query, selectedCategories, selectedKeywords, selectedTags],
  );

  const toggleValue = (value: string, values: string[], setValues: (next: string[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedTags([]);
    setSelectedCategories([]);
    setSelectedKeywords([]);
  };

  const hasActiveFilters = Boolean(query.trim()) || selectedTags.length > 0 || selectedCategories.length > 0 || selectedKeywords.length > 0;

  const closeMobileFilters = useCallback(() => setMobileFiltersOpen(false), []);
  const filterLabels = {
    category: copy.filterCategory,
    clear: copy.clearFilters,
    filters: copy.filtersTitle,
    keywords: copy.filterKeyword,
    showing: copy.showing.replace('{{filtered}}', String(filteredSets.length)).replace('{{total}}', String(sets.length)),
    tags: copy.filterTags,
  };
  const filterProps = {
    categoryOptions: allCategories,
    hasActiveFilters,
    keywordOptions: allKeywords,
    labels: filterLabels,
    selectedCategories,
    selectedKeywords,
    selectedTags,
    tagOptions: allTags,
    onClear: clearFilters,
    onToggleCategory: (value: string) => toggleValue(value, selectedCategories, setSelectedCategories),
    onToggleKeyword: (value: string) => toggleValue(value, selectedKeywords, setSelectedKeywords),
    onToggleTag: (value: string) => toggleValue(value, selectedTags, setSelectedTags),
  };

  return (
    <div data-testid="interview-catalog-page" className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <Navbar onMobileBrandClick={() => setMobileFiltersOpen(true)} mobileBrandMenuOpen={mobileFiltersOpen} />
      <main className="flex-grow pt-[64px]">
        <section className="bg-surface-container-low py-stack-lg border-b border-outline-variant">
          <div className="mx-auto flex w-full max-w-[1920px] flex-col items-center px-4 text-center sm:px-6 lg:px-8">
            <h1 className="font-h1 text-h1 text-on-surface mb-stack-sm max-w-[800px]">{copy.heroTitle}</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-md max-w-content-max">{copy.heroBody}</p>
            <div className="relative w-full max-w-[600px] shadow-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-6 h-6" aria-hidden="true" />
              <input
                aria-label={copy.searchPlaceholder}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-12 pr-32 py-4 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                type="text"
                value={query}
              />
              <button type="button" onClick={() => setQuery(query.trim())} className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-on-primary font-label-sm text-label-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                {copy.searchButton}
              </button>
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-gutter px-4 py-stack-lg sm:px-6 lg:flex-row lg:px-8">
          <InterviewFiltersSidebar {...filterProps} />

          <section data-testid="interview-results" className="mt-6 min-w-0 flex-grow">
            <div className="flex items-center justify-between mb-stack-sm">
              <h2 className="font-h2 text-h2 text-on-surface">{copy.heroTitle}</h2>
              <span className="font-body-md text-body-md text-on-surface-variant">
                {copy.showing.replace('{{filtered}}', String(filteredSets.length)).replace('{{total}}', String(sets.length))}
              </span>
            </div>

            {filteredSets.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredSets.map((set) => (
                  <InterviewCard key={set.id} set={set} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
                <h3 className="font-h3 text-[20px] text-on-surface mb-2">{copy.noMatches}</h3>
                <p className="text-sm text-on-surface-variant mb-5">{copy.noMatchesBody}</p>
                <button onClick={clearFilters} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-label-sm text-on-primary hover:bg-primary/90">
                  {copy.clearFilters}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
      <InterviewMobileFiltersDrawer open={mobileFiltersOpen} onClose={closeMobileFilters} {...filterProps} />
      <Footer />
    </div>
  );
}
