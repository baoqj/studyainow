import { CheckCircle2, Coffee, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import type { AppLocale } from '../../data/courseContent';
import { getSupportCopy } from '../../data/supportCopy';
import { SUPPORT_PROMPT_EVENT } from './SupportButton';
import wechatQrCode from '../../../../pics/tips/tips_wechat.png';
import alipayQrCode from '../../../../pics/tips/tips_alipay.png';

const PROMPT_COOKIE = 'studyai_now_support_prompt_seen';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type PromptState = 'support' | 'success' | 'cancelled' | 'verifying' | 'verification_failed';
const COFFEE_AMOUNTS = [2, 5, 10] as const;

function recordPromptCookie() {
  document.cookie = `${PROMPT_COOKIE}=1; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax; Secure`;
}

export function SupportPrompt() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const copy = getSupportCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  const [isOpen, setIsOpen] = useState(false);
  const [promptState, setPromptState] = useState<PromptState>('support');
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const close = () => {
    setIsOpen(false);
    setCheckoutError('');
  };

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setIsOpen(false);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const donationState = params.get('donation');
    const locale = params.get('locale');
    if (locale && ['zh-CN', 'zh-TW', 'en', 'fr', 'es'].includes(locale)) void i18n.changeLanguage(locale);

    if (donationState === 'success') {
      const sessionId = params.get('session_id');
      recordPromptCookie();
      setPromptState('verifying');
      setIsOpen(true);
      params.delete('donation');
      params.delete('session_id');
      params.delete('locale');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      if (!sessionId) {
        setPromptState('verification_failed');
        return;
      }
      void fetch(`/api/donations/session?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (response) => ({ response, payload: await response.json() as { paid?: unknown } }))
        .then(({ response, payload }) => setPromptState(response.ok && payload.paid === true ? 'success' : 'verification_failed'))
        .catch(() => setPromptState('verification_failed'));
      return;
    }

    if (donationState === 'cancelled') {
      recordPromptCookie();
      setPromptState('cancelled');
      setIsOpen(true);
      params.delete('donation');
      params.delete('locale');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      return;
    }

    // A donation prompt must never interrupt first paint or a learning flow.
    // It opens only from the explicit SupportButton event above, or after a
    // payment return where a confirmation is genuinely useful.
  }, [i18n, location.pathname]);

  useEffect(() => {
    const open = () => {
      if (window.location.pathname.startsWith('/admin')) return;
      setPromptState('support');
      setCheckoutError('');
      setIsOpen(true);
    };
    window.addEventListener(SUPPORT_PROMPT_EVENT, open);
    return () => window.removeEventListener(SUPPORT_PROMPT_EVENT, open);
  }, []);

  const startCheckout = async (amount: number) => {
    setCheckoutError('');
    setIsStartingCheckout(true);
    try {
      const response = await fetch('/api/donations/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount, language: i18n.resolvedLanguage ?? i18n.language }),
      });
      const data = (await response.json()) as { url?: string };
      if (!response.ok || !data.url) {
        setCheckoutError(response.status === 503 ? copy.unavailable : copy.startFailed);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setCheckoutError(copy.startFailed);
    } finally {
      setIsStartingCheckout(false);
    }
  };

  if (!isOpen) return null;

  const title = promptState === 'success' ? copy.successTitle
    : promptState === 'cancelled' ? copy.cancelledTitle
      : promptState === 'verifying' ? copy.verifyingTitle
        : promptState === 'verification_failed' ? copy.verificationFailedTitle
          : copy.title;
  const body = promptState === 'success' ? copy.successBody
    : promptState === 'cancelled' ? copy.cancelledBody
      : promptState === 'verifying' ? copy.verifyingBody
        : promptState === 'verification_failed' ? copy.verificationFailedBody
          : copy.body;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-8" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="support-prompt-title" className="relative w-full max-w-md overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={close} aria-label={copy.close} className="absolute right-4 top-4 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {promptState === 'support' ? <Coffee className="h-6 w-6" /> : promptState === 'verifying' ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
        </div>
        <h2 id="support-prompt-title" className="pr-7 text-2xl font-bold leading-tight text-on-surface">{title}</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-on-surface-variant">{body}</p>
        {checkoutError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{checkoutError}</p>}
        {promptState === 'support' && <>
          <section className="mt-6 border-t border-outline-variant/45 pt-5" aria-labelledby="qr-payment-title">
            <h3 id="qr-payment-title" className="text-sm font-bold text-on-surface">{copy.qrPaymentTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">{copy.qrPaymentDescription}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { id: 'wechat', label: copy.wechat, image: wechatQrCode },
                { id: 'alipay', label: copy.alipay, image: alipayQrCode },
              ].map(({ id, label, image }) => (
                <figure key={id} className="rounded-2xl border border-outline-variant/55 bg-surface-container-low p-3 text-center" data-testid={`support-qr-${id}`}>
                  <img src={image} alt={copy.qrCodeAlt.replace('{{method}}', label)} width={192} height={192} className="mx-auto aspect-square w-full max-w-[132px] rounded-lg bg-white object-contain" />
                  <figcaption className="mt-2 text-xs font-semibold text-on-surface">{label}</figcaption>
                </figure>
              ))}
            </div>
          </section>
          <div className="mt-7 grid grid-cols-3 gap-2">
            {COFFEE_AMOUNTS.map((amount) => <button key={amount} type="button" onClick={() => void startCheckout(amount)} disabled={isStartingCheckout} className="inline-flex items-center justify-center rounded-xl border border-primary/25 bg-primary/5 px-2 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-wait disabled:opacity-70">
              {isStartingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.amount.replace('{{amount}}', String(amount))}
            </button>)}
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-on-surface-variant">{copy.note}</p>
        </>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={isStartingCheckout} className="rounded-full px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-60">
            {promptState === 'support' ? copy.notNow : copy.close}
          </button>
          {promptState === 'success' && (
            <button type="button" onClick={() => { close(); window.location.assign('/courses'); }} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
              <Coffee className="h-4 w-4" />
              {copy.continueLearning}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
