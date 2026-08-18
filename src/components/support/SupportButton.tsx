import { Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';
import { getSupportCopy } from '../../data/supportCopy';

export const SUPPORT_PROMPT_EVENT = 'studyai-now:open-support-prompt';

export function openSupportPrompt() {
  window.dispatchEvent(new Event(SUPPORT_PROMPT_EVENT));
}

export function SupportButton({ variant = 'button' }: { variant?: 'button' | 'link' }) {
  const { i18n } = useTranslation();
  const copy = getSupportCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  const className = variant === 'link'
    ? 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-label-sm text-xs text-on-surface-variant underline decoration-outline-variant underline-offset-4 transition-all hover:text-primary'
    : 'inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2';

  return (
    <button type="button" className={className} onClick={openSupportPrompt} data-testid="support-button">
      <Coffee className={`${variant === 'link' ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0`} aria-hidden="true" />
      <span className="whitespace-nowrap">{variant === 'link' ? copy.footerButton : copy.button}</span>
    </button>
  );
}
