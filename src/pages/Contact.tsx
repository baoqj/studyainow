import { type FormEvent, useMemo, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { getPublicInfoCopy } from '../data/publicInfoCopy';
import type { AppLocale } from '../data/courseCatalog';

const SUPPORT_EMAIL = 'studyainow@mail.com';

type ContactForm = {
  name: string;
  email: string;
  message: string;
};

const emptyForm: ContactForm = { name: '', email: '', message: '' };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function Contact() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getPublicInfoCopy(locale).contact;
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const submitLabel = useMemo(() => (status === 'sending' ? copy.sending : copy.send), [copy.send, copy.sending, status]);

  function updateForm(field: keyof ContactForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError('');
    if (status !== 'idle') setStatus('idle');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || name.length > 120) return setError(copy.errorName);
    if (!isValidEmail(email) || email.length > 254) return setError(copy.errorEmail);
    if (message.length < 2 || message.length > 5000) return setError(copy.errorMessage);

    setStatus('sending');
    setError('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) throw new Error();
      setForm(emptyForm);
      setStatus('sent');
    } catch {
      setStatus('failed');
      setError(copy.failed);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-18 lg:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">{copy.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-on-surface sm:text-5xl">{copy.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-on-surface-variant">{copy.intro}</p>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-7 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:px-10">
          <aside className="h-fit rounded-2xl border border-outline-variant bg-surface-container-low p-6">
            <Mail className="h-7 w-7 text-primary" />
            <h2 className="mt-5 text-xl font-black tracking-tight text-on-surface">{copy.emailLabel}</h2>
            <p className="mt-3 leading-7 text-on-surface-variant">{copy.emailBody}</p>
            <a className="mt-5 inline-flex break-all text-lg font-bold text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </aside>

          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-on-surface">{copy.formTitle}</h2>
            <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-on-surface">{copy.nameLabel}</span>
                <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} maxLength={120} autoComplete="name" required className="mt-2 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" placeholder={copy.namePlaceholder} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-on-surface">{copy.emailFieldLabel}</span>
                <input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} maxLength={254} autoComplete="email" required className="mt-2 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" placeholder={copy.emailPlaceholder} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-on-surface">{copy.messageLabel}</span>
                <textarea value={form.message} onChange={(event) => updateForm('message', event.target.value)} maxLength={5000} minLength={2} required rows={7} className="mt-2 w-full resize-y rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" placeholder={copy.messagePlaceholder} />
              </label>

              {error && <p role="alert" className="rounded-lg border border-error/30 bg-error-container/35 px-3 py-2.5 text-sm text-error">{error}</p>}
              {status === 'sent' && <p role="status" className="rounded-lg border border-primary/25 bg-primary-container/30 px-3 py-2.5 text-sm text-on-surface">{copy.sent}</p>}
              <p className="text-xs leading-5 text-on-surface-variant">{copy.privacy}</p>
              <button type="submit" disabled={status === 'sending'} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70">
                <Send className="h-4 w-4" />
                {submitLabel}
              </button>
            </form>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
}
