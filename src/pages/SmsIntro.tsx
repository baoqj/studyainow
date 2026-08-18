import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Loader2, MessageCircle, UserRound } from 'lucide-react';

interface CardProfile {
  id: string;
  displayName: string;
  smsName: string;
  phone: string;
  email: string;
  businessCardUrl: string;
  smsTemplate: string;
  defaultSenderName: string;
  defaultMessage: string;
  vcardUrl: string;
}

type AnalyticsEventName = 'sms_intro_page_view' | 'sms_open_clicked' | 'sms_message_copied';

function templateMessage(template: string, recipientName: string, senderName: string) {
  const safeSenderName = senderName.trim() || 'MyName';

  return template
    .replaceAll('{recipientName}', recipientName)
    .replaceAll('{senderName}', safeSenderName);
}

function cleanSource(value: string | null) {
  return value === 'nfc' || value === 'qr' ? value : null;
}

function sendAnalytics(eventName: AnalyticsEventName, payload: Record<string, string | null>) {
  const body = JSON.stringify({
    event_name: eventName,
    ...payload,
    page_path: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function SmsIntro() {
  const { cardId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [senderName, setSenderName] = useState('MyName');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const pageViewLoggedRef = useRef(false);

  const source = cleanSource(searchParams.get('source'));
  const campaign = searchParams.get('campaign');
  const eventLabel = searchParams.get('event');

  const analyticsPayload = useMemo(
    () => ({
      card_id: cardId || null,
      source,
      campaign,
      event: eventLabel,
    }),
    [campaign, cardId, eventLabel, source],
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}`);
        const data = (await response.json()) as { profile?: CardProfile; error?: string };

        if (!response.ok || !data.profile) {
          throw new Error(data.error || 'Card profile not found');
        }

        if (!cancelled) {
          setProfile(data.profile);
          setSenderName(data.profile.defaultSenderName);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load card profile');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (cardId) {
      void fetchProfile();
    } else {
      setError('Card profile not found');
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  useEffect(() => {
    if (!profile || pageViewLoggedRef.current) return;

    pageViewLoggedRef.current = true;
    sendAnalytics('sms_intro_page_view', analyticsPayload);
  }, [analyticsPayload, profile]);

  const message = useMemo(() => {
    if (!profile) return '';

    return templateMessage(profile.smsTemplate, profile.smsName, senderName);
  }, [profile, senderName]);

  const smsHref = profile ? `sms:${profile.phone}?body=${encodeURIComponent(message)}` : '#';

  function openMessages() {
    if (!profile) return;

    sendAnalytics('sms_open_clicked', analyticsPayload);
    window.location.href = smsHref;
  }

  async function copyMessage() {
    if (!message) return;

    try {
      await copyText(message);
      setCopyState('copied');
      sendAnalytics('sms_message_copied', analyticsPayload);
      window.setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('failed');
    }
  }

  const sourceLabel = source === 'nfc' ? 'NFC scan' : source === 'qr' ? 'QR scan' : null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f6f1e8] text-[#17201c]">
      <header className="mx-auto flex w-[calc(100vw-40px)] max-w-3xl items-center justify-between gap-3 py-5 sm:w-full sm:px-5">
        <a href="/" className="text-xl font-black tracking-normal">
          aibao.me
        </a>
        {sourceLabel && (
          <span className="shrink-0 rounded-full border border-[#d4cab9] bg-white/70 px-3 py-1 text-xs font-semibold text-[#52635c]">
            {sourceLabel}
          </span>
        )}
      </header>

      <main className="mx-auto flex w-[calc(100vw-40px)] max-w-3xl flex-col gap-5 pb-10 sm:w-full sm:px-5">
        <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[8px] border border-[#17201c] bg-[#fcfaf5] sm:shadow-[8px_8px_0_#d8cfbf]">
          <div className="border-b border-[#d8cfbf] bg-[#17201c] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-[#73d7bd]" />
              <p className="text-sm font-semibold uppercase tracking-normal text-[#dce8e1]">SMS Intro</p>
            </div>
            <h1 className="mt-4 text-[2rem] font-black leading-tight tracking-normal sm:text-5xl">
              Start the follow-up text
            </h1>
          </div>

          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#0f8a75]" />
            </div>
          ) : error || !profile ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
              <AlertTriangle className="h-10 w-10 text-[#c4552d]" />
              <p className="text-lg font-bold">{error || 'Card profile not found'}</p>
              <a href="/" className="rounded-lg bg-[#17201c] px-5 py-3 text-sm font-semibold text-white">
                Back to aibao.me
              </a>
            </div>
          ) : (
            <div className="grid min-w-0 gap-0 md:grid-cols-[1fr_1.1fr]">
              <div className="min-w-0 border-b border-[#d8cfbf] p-5 md:border-b-0 md:border-r">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0f8a75] text-white">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-normal text-[#68766f]">Recipient</p>
                    <h2 className="mt-1 text-2xl font-black tracking-normal">{profile.displayName}</h2>
                    <p className="mt-1 font-code-block text-base text-[#33413d]">{profile.phone}</p>
                  </div>
                </div>

                <label className="mt-8 block">
                  <span className="text-sm font-semibold uppercase tracking-normal text-[#68766f]">Your name</span>
                  <input
                    value={senderName}
                    className="mt-2 w-full rounded-lg border border-[#b9ae9e] bg-white px-4 py-3 text-base font-semibold outline-none transition focus:border-[#17201c] focus:ring-2 focus:ring-[#73d7bd]"
                    inputMode="text"
                    onChange={(inputEvent) => setSenderName(inputEvent.target.value)}
                  />
                </label>

                <div className="mt-5 flex flex-wrap gap-2">
                  {campaign && (
                    <span className="rounded-full bg-[#e9dfcf] px-3 py-1 text-xs font-semibold text-[#52635c]">
                      {campaign}
                    </span>
                  )}
                  {eventLabel && (
                    <span className="rounded-full bg-[#dceee8] px-3 py-1 text-xs font-semibold text-[#315c50]">
                      {eventLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0 p-5">
                <p className="text-sm font-semibold uppercase tracking-normal text-[#68766f]">Message preview</p>
                <div className="mt-3 w-full max-w-full rounded-lg border border-[#d8cfbf] bg-[#f6f1e8] p-4">
                  <p className="min-w-0 whitespace-pre-wrap break-words text-lg leading-relaxed text-[#17201c]">{message}</p>
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-[#17201c] px-5 py-3 text-base font-bold text-white transition hover:bg-[#293630]"
                    type="button"
                    onClick={openMessages}
                  >
                    <MessageCircle className="h-5 w-5" />
                    Open Messages
                  </button>
                  <button
                    className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-[#b9ae9e] bg-white px-5 py-3 text-base font-bold text-[#17201c] transition hover:border-[#17201c]"
                    type="button"
                    onClick={copyMessage}
                  >
                    {copyState === 'copied' ? <CheckCircle2 className="h-5 w-5 text-[#0f8a75]" /> : <Copy className="h-5 w-5" />}
                    {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy Failed' : 'Copy Message'}
                  </button>
                  <a
                    className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-[#b9ae9e] bg-[#fcfaf5] px-5 py-3 text-base font-bold text-[#17201c] transition hover:border-[#17201c] hover:bg-white"
                    href={profile.businessCardUrl}
                  >
                    View Business Card
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#68766f]">
                  The message opens in your SMS app for review before sending.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
