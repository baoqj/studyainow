export interface InterviewFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface InterviewFiltersSidebarProps {
  categoryOptions: InterviewFilterOption[];
  hasActiveFilters: boolean;
  keywordOptions: InterviewFilterOption[];
  labels: {
    category: string;
    clear: string;
    filters: string;
    keywords: string;
    showing: string;
    tags: string;
  };
  selectedCategories: string[];
  selectedKeywords: string[];
  selectedTags: string[];
  tagOptions: InterviewFilterOption[];
  onClear: () => void;
  onToggleCategory: (value: string) => void;
  onToggleKeyword: (value: string) => void;
  onToggleTag: (value: string) => void;
  mode?: 'desktop' | 'drawer';
}

function FilterCheckbox({
  checked,
  option,
  onToggle,
}: {
  checked: boolean;
  key?: string;
  option: InterviewFilterOption;
  onToggle: (value: string) => void;
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

function FilterGroup({
  label,
  options,
  selected,
  testId,
  onToggle,
}: {
  label: string;
  options: InterviewFilterOption[];
  selected: string[];
  testId: string;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div data-testid={testId}>
      <h4 className="mb-3 font-label-sm text-label-sm uppercase tracking-wider text-outline">{label}</h4>
      <ul className="flex flex-col gap-2 font-body-md text-on-surface-variant">
        {options.map((option) => (
          <FilterCheckbox
            key={option.value}
            checked={selected.includes(option.value)}
            option={option}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  );
}

export function InterviewFiltersSidebar({
  categoryOptions,
  hasActiveFilters,
  keywordOptions,
  labels,
  selectedCategories,
  selectedKeywords,
  selectedTags,
  tagOptions,
  onClear,
  onToggleCategory,
  onToggleKeyword,
  onToggleTag,
  mode = 'desktop',
}: InterviewFiltersSidebarProps) {
  return (
    <aside
      aria-label={labels.filters}
      data-testid={mode === 'desktop' ? 'interview-filters-sidebar' : 'interview-filters-drawer-content'}
      className={`${mode === 'desktop' ? 'mt-6 hidden lg:flex lg:w-64' : 'mt-0 flex w-full'} shrink-0 flex-col gap-stack-md`}
    >
      <div className="border-b border-outline-variant pb-stack-sm">
        <div className="mb-stack-sm flex items-center justify-between gap-3">
          <h2 className="font-h3 text-h3 text-on-surface">{labels.filters}</h2>
          {hasActiveFilters && (
            <button type="button" onClick={onClear} className="text-[12px] font-label-sm text-primary hover:underline">
              {labels.clear}
            </button>
          )}
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">{labels.showing}</p>
      </div>

      <FilterGroup
        label={labels.category}
        options={categoryOptions}
        selected={selectedCategories}
        testId="interview-category-filters"
        onToggle={onToggleCategory}
      />
      <FilterGroup
        label={labels.tags}
        options={tagOptions}
        selected={selectedTags}
        testId="interview-tag-filters"
        onToggle={onToggleTag}
      />
      <FilterGroup
        label={labels.keywords}
        options={keywordOptions}
        selected={selectedKeywords}
        testId="interview-keyword-filters"
        onToggle={onToggleKeyword}
      />
    </aside>
  );
}
