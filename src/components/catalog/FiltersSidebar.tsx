import type { CourseAccess, CourseDifficulty } from '../../data/courseCatalog';
import { useTranslation } from 'react-i18next';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count: number;
}

export interface FiltersSidebarProps {
  accessOptions: FilterOption<CourseAccess>[];
  difficultyOptions: FilterOption<CourseDifficulty>[];
  filteredCount: number;
  hasActiveFilters: boolean;
  selectedAccess: CourseAccess[];
  selectedDifficulties: CourseDifficulty[];
  selectedTopics: string[];
  topicOptions: FilterOption<string>[];
  totalCount: number;
  onClear: () => void;
  onToggleAccess: (value: CourseAccess) => void;
  onToggleDifficulty: (value: CourseDifficulty) => void;
  onToggleTopic: (value: string) => void;
  mode?: 'desktop' | 'drawer';
}

function FilterCheckbox<T extends string>({
  checked,
  option,
  onToggle,
}: {
  checked: boolean;
  key?: string;
  option: FilterOption<T>;
  onToggle: (value: T) => void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary">
        <span className="flex min-w-0 items-center gap-2">
          <input
            checked={checked}
            onChange={() => onToggle(option.value)}
            type="checkbox"
            className="rounded text-primary focus:ring-primary"
          />
          <span className="truncate">{option.label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-label-sm text-on-surface-variant">
          {option.count}
        </span>
      </label>
    </li>
  );
}

export function FiltersSidebar({
  accessOptions,
  difficultyOptions,
  filteredCount,
  hasActiveFilters,
  selectedAccess,
  selectedDifficulties,
  selectedTopics,
  topicOptions,
  totalCount,
  onClear,
  onToggleAccess,
  onToggleDifficulty,
  onToggleTopic,
  mode = 'desktop',
}: FiltersSidebarProps) {
  const { t } = useTranslation();
  return (
    <aside className={`${mode === 'desktop' ? 'mt-6 hidden lg:flex lg:w-64' : 'mt-0 flex w-full'} shrink-0 flex-col gap-stack-md`}>
      <div className="pb-stack-sm border-b border-outline-variant">
        <div className="mb-stack-sm flex items-center justify-between gap-3">
          <h3 className="font-h3 text-h3 text-on-surface">{t('filter.title')}</h3>
          {hasActiveFilters && (
            <button onClick={onClear} className="text-[12px] font-label-sm text-primary hover:underline">
              {t('filter.clear')}
            </button>
          )}
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t('filter.showing', { filtered: filteredCount, total: totalCount })}
        </p>
      </div>

      <div>
        <h4 className="font-label-sm text-label-sm text-on-surface mb-3 uppercase tracking-wider text-outline">{t('filter.topic')}</h4>
        <ul className="flex flex-col gap-2 font-body-md text-on-surface-variant">
          {topicOptions.map((option) => (
            <FilterCheckbox
              key={option.value}
              checked={selectedTopics.includes(option.value)}
              option={option}
              onToggle={onToggleTopic}
            />
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-label-sm text-label-sm text-on-surface mb-3 uppercase tracking-wider text-outline">{t('filter.difficulty')}</h4>
        <ul className="flex flex-col gap-2 font-body-md text-on-surface-variant">
          {difficultyOptions.map((option) => (
            <FilterCheckbox
              key={option.value}
              checked={selectedDifficulties.includes(option.value)}
              option={option}
              onToggle={onToggleDifficulty}
            />
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-label-sm text-label-sm text-on-surface mb-3 uppercase tracking-wider text-outline">{t('filter.access')}</h4>
        <ul className="flex flex-col gap-2 font-body-md text-on-surface-variant">
          {accessOptions.map((option) => (
            <FilterCheckbox
              key={option.value}
              checked={selectedAccess.includes(option.value)}
              option={option}
              onToggle={onToggleAccess}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}
