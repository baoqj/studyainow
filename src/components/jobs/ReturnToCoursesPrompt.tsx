import { useEffect } from 'react';

type ReturnToCoursesPromptProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReturnToCoursesPrompt({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ReturnToCoursesPromptProps) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel, open]);

  if (!open) return null;

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-5" role="presentation">
    <button type="button" aria-label={cancelLabel} onClick={onCancel} className="absolute inset-0 bg-[#071a33]/35" />
    <section role="alertdialog" aria-modal="true" aria-labelledby="return-to-courses-title" aria-describedby="return-to-courses-description" className="relative w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl">
      <h2 id="return-to-courses-title" className="text-xl font-black tracking-tight text-on-surface">{title}</h2>
      <p id="return-to-courses-description" className="mt-3 text-sm leading-relaxed text-on-surface-variant">{body}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{cancelLabel}</button>
        <button type="button" onClick={onConfirm} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{confirmLabel}</button>
      </div>
    </section>
  </div>;
}
