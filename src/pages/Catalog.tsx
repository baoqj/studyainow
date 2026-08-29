import { useCallback, useMemo, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HeroSection } from '../components/catalog/HeroSection';
import { FiltersSidebar } from '../components/catalog/FiltersSidebar';
import { MobileFiltersDrawer } from '../components/catalog/MobileFiltersDrawer';
import { CourseCard } from '../components/catalog/CourseCard';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCatalogCourseStartPath, getCatalogCourses, type AppLocale, type CourseAccess, type CourseDifficulty } from '../data/courseCatalog';
import { localizedPublicPath } from '../lib/localeRoutes';

export function Catalog() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const catalogCourses = getCatalogCourses(locale);
  const claudeCodeCourse = catalogCourses.find((course) => course.id === 'claude-code-guide') ?? catalogCourses[0];
  const continuePath = claudeCodeCourse ? getCatalogCourseStartPath(claudeCodeCourse, locale) : localizedPublicPath('/', locale);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<CourseDifficulty[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<CourseAccess[]>([]);
  const [query, setQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const topicOptions = useMemo(
    () =>
      Array.from(new Set(catalogCourses.map((course) => course.topic))).map((topic) => ({
        value: topic,
        label: topic,
        count: catalogCourses.filter((course) => course.topic === topic).length,
      })),
    [catalogCourses],
  );

  const difficultyOptions = useMemo(
    () =>
      (['Beginner', 'Intermediate', 'Advanced'] as CourseDifficulty[]).map((difficulty) => ({
        value: difficulty,
        label:
          difficulty === 'Beginner' ? t('filter.beginner') : difficulty === 'Intermediate' ? t('filter.intermediate') : t('filter.advanced'),
        count: catalogCourses.filter((course) => course.difficulty === difficulty).length,
      })),
    [catalogCourses, t],
  );

  const accessOptions = useMemo(
    () =>
      (['free', 'pro'] as CourseAccess[]).map((access) => ({
        value: access,
        label: access === 'free' ? t('filter.free') : t('filter.pro'),
        count: catalogCourses.filter((course) => course.access.includes(access)).length,
      })),
    [catalogCourses, t],
  );

  const filteredCourses = useMemo(
    () =>
      catalogCourses.filter((course) => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const searchable = [course.title, course.subtitle, course.description, course.topic, ...course.skills].join(' ').toLocaleLowerCase();
        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
        const matchesTopic = selectedTopics.length === 0 || selectedTopics.includes(course.topic);
        const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(course.difficulty);
        const matchesAccess = selectedAccess.length === 0 || selectedAccess.some((access) => course.access.includes(access));

        return matchesQuery && matchesTopic && matchesDifficulty && matchesAccess;
      }),
    [catalogCourses, query, selectedAccess, selectedDifficulties, selectedTopics],
  );

  const hasActiveFilters = Boolean(query.trim()) || selectedTopics.length > 0 || selectedDifficulties.length > 0 || selectedAccess.length > 0;

  function toggleTopic(value: string) {
    setSelectedTopics((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleDifficulty(value: CourseDifficulty) {
    setSelectedDifficulties((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleAccess(value: CourseAccess) {
    setSelectedAccess((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function clearFilters() {
    setSelectedTopics([]);
    setSelectedDifficulties([]);
    setSelectedAccess([]);
    setQuery('');
  }

  const closeMobileFilters = useCallback(() => setMobileFiltersOpen(false), []);

  return (
    <div data-testid="catalog-page" className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <Navbar onMobileBrandClick={() => setMobileFiltersOpen(true)} mobileBrandMenuOpen={mobileFiltersOpen} />
      <main className="flex-grow pt-[64px]">
        <HeroSection query={query} onQueryChange={setQuery} />
        
        <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-gutter px-4 py-stack-lg sm:px-6 lg:flex-row lg:px-8">
          <FiltersSidebar
            accessOptions={accessOptions}
            difficultyOptions={difficultyOptions}
            filteredCount={filteredCourses.length}
            hasActiveFilters={hasActiveFilters}
            selectedAccess={selectedAccess}
            selectedDifficulties={selectedDifficulties}
            selectedTopics={selectedTopics}
            topicOptions={topicOptions}
            totalCount={catalogCourses.length}
            onClear={clearFilters}
            onToggleAccess={toggleAccess}
            onToggleDifficulty={toggleDifficulty}
            onToggleTopic={toggleTopic}
          />
          
          <div className="flex-grow flex flex-col gap-stack-lg mt-6">
            {/* Continue Learning */}
            <section>
              <div className="flex items-center justify-between mb-stack-sm">
                <h2 className="font-h2 text-h2 text-on-surface">{t('catalog.continue')}</h2>
                <Link to="/me" className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1">
                  {t('catalog.myDashboard')} <ArrowRight className="w-4 h-4 text-primary" />
                </Link>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-sm">
                <div className="w-full md:w-48 h-32 overflow-hidden rounded-lg bg-[#111827] p-4 font-code-block text-sm text-cyan-200">
                  <div className="mb-2 text-slate-500">$ claude</div>
                  <div>{t('catalog.goal')}</div>
                  <div className="text-emerald-300">{t('catalog.plan')}</div>
                </div>
                <div className="flex-grow">
                  <span className="inline-block px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[12px] rounded mb-2">Claude Code</span>
                  <h3 className="font-h3 text-h3 text-on-surface mb-1">{claudeCodeCourse.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    {t('catalog.lessonContext', { chapter: '04', lesson: '02', title: 'Claude Code' })}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-grow bg-surface-container h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[65%]"></div>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">65%</span>
                  </div>
                </div>
                <Link to={continuePath} className="bg-primary text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
                  {t('catalog.continueReading')}
                </Link>
              </div>
            </section>

            {/* Popular Courses */}
            <section>
              <div className="flex items-center justify-between mb-stack-sm">
                <h2 className="font-h2 text-h2 text-on-surface">{t('catalog.popular')}</h2>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {t('catalog.showing', { filtered: filteredCourses.length, total: catalogCourses.length })}
                </span>
              </div>
              
              {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {filteredCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
                  <h3 className="font-h3 text-[20px] text-on-surface mb-2">{t('catalog.noMatches')}</h3>
                  <p className="text-sm text-on-surface-variant mb-5">{t('catalog.noMatchesBody')}</p>
                  <button
                    onClick={clearFilters}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-label-sm text-on-primary hover:bg-primary/90"
                  >
                    {t('catalog.clearFilters')}
                  </button>
                </div>
              )}
              
              <div className="mt-8 flex justify-center">
                <button className="border border-outline hover:bg-surface-container text-on-surface font-label-sm text-label-sm px-6 py-2 rounded-lg transition-colors">
                  {t('catalog.more')}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
      <MobileFiltersDrawer
        open={mobileFiltersOpen}
        onClose={closeMobileFilters}
        accessOptions={accessOptions}
        difficultyOptions={difficultyOptions}
        filteredCount={filteredCourses.length}
        hasActiveFilters={hasActiveFilters}
        selectedAccess={selectedAccess}
        selectedDifficulties={selectedDifficulties}
        selectedTopics={selectedTopics}
        topicOptions={topicOptions}
        totalCount={catalogCourses.length}
        onClear={clearFilters}
        onToggleAccess={toggleAccess}
        onToggleDifficulty={toggleDifficulty}
        onToggleTopic={toggleTopic}
      />
      <Footer />
    </div>
  );
}
