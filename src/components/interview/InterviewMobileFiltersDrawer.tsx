import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InterviewFiltersSidebar, type InterviewFiltersSidebarProps } from './InterviewFiltersSidebar';

type InterviewMobileFiltersDrawerProps = InterviewFiltersSidebarProps & {
  open: boolean;
  onClose: () => void;
};

export function InterviewMobileFiltersDrawer({ open, onClose, ...filters }: InterviewMobileFiltersDrawerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  return (
    <div
      className={`fixed inset-0 z-[60] md:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        aria-label={t('filter.close')}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-[#071a33]/35 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-interview-filter-title"
        data-testid="interview-filters-drawer"
        className={`absolute inset-y-0 left-0 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col border-r border-outline-variant bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant p-4">
          <h2 id="mobile-interview-filter-title" className="font-h3 text-h3 text-on-surface">
            {filters.labels.filters}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('filter.close')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain p-5 [scrollbar-gutter:stable]">
          <InterviewFiltersSidebar {...filters} mode="drawer" />
        </div>
      </aside>
    </div>
  );
}
