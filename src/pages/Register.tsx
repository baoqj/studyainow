import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chrome, Lock, Mail, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/layout/Navbar';
import { BrandWordmark } from '../components/brand/BrandWordmark';

interface RegisterResponse {
  ok?: boolean;
  email?: string;
  email_result?: {
    sent?: boolean;
    reason?: string;
    verification_url?: string;
  };
  error?: string;
}

export function Register() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, email, password, passwordConfirm, locale: i18n.resolvedLanguage ?? i18n.language }),
      });
      const data = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok) {
        throw new Error(data.error ?? t('Registration failed'));
      }

      setResult(data);
      setPassword('');
      setPasswordConfirm('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pt-24 text-on-surface">
      <Navbar />
      <main className="flex items-center justify-center px-6 pb-12">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <Link to="/" aria-label="Study AI Now!" className="mb-8 block text-xl">
          <BrandWordmark />
        </Link>
        <h1 className="font-h1 text-[32px] mb-2">{t('Create account')}</h1>
        <p className="text-sm text-on-surface-variant mb-8">{t('After registration, verify your email before logging in and saving learning progress.')}</p>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t('Username')}</span>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                autoComplete="username"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t('Registration email')}</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                type="email"
                autoComplete="email"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t('Password')}</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t('Confirm password')}</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {result?.ok && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p>{t('Registration successful. Please check {{email}} for the verification email.', { email: result.email ?? email })}</p>
              {result.email_result?.verification_url && (
                <a className="mt-2 block break-all font-medium text-primary" href={result.email_result.verification_url}>
                  {t('Open development verification link')}
                </a>
              )}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary px-5 py-3 font-label-sm text-sm text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t('Creating...') : t('Register and send verification email')}
          </button>
        </form>

        <a
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 text-sm font-medium hover:bg-surface-container-low"
          href="/api/auth/google/start"
        >
          <Chrome className="h-4 w-4" />
          {t('Continue with Google')}
        </a>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          {t('Already have an account?')}{' '}
          <Link className="font-medium text-primary" to="/login">
            {t('Go to login')}
          </Link>
        </p>
      </div>
      </main>
    </div>
  );
}
