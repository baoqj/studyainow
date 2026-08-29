import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Chrome, Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/layout/Navbar';
import { BrandWordmark } from '../components/brand/BrandWordmark';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t('Login failed'));
      }

      const data = (await response.json()) as { user: { roles: string[] } };
      const requestedNext = searchParams.get('next');
      const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : null;
      navigate(data.user.roles.some((role) => role === 'admin' || role === 'leader') ? '/admin' : next ?? '/me');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('Login failed'));
    } finally {
      setLoading(false);
    }
  }

  const notice = searchParams.get('verified') === '1' ? t('Email verification succeeded. You can now log in.') : null;
  const queryError = searchParams.get('error');
  const queryErrorText =
    queryError === 'verification_invalid'
      ? t('The verification link is invalid or expired. Please register again or resend the verification email.')
      : queryError === 'google_not_configured'
        ? t('Google login is not configured yet. Please use email and password first.')
        : queryError === 'google_failed'
          ? t('Google login failed. Please try again later.')
          : null;

  return (
    <div className="min-h-screen bg-background pt-24 text-on-surface">
      <Navbar />
      <main className="flex items-center justify-center px-6 pb-12">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <Link to="/" aria-label="Study AI Now!" className="mb-8 block text-xl">
          <BrandWordmark />
        </Link>
        <h1 className="font-h1 text-[32px] mb-2">{t('Login')}</h1>
        <p className="text-sm text-on-surface-variant mb-8">{t('Log in to save reading progress, CLI Lab sessions, and subscription status.')}</p>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t('Email')}</span>
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
                autoComplete="current-password"
              />
            </div>
          </label>

          {notice && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}
          {queryErrorText && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{queryErrorText}</div>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary px-5 py-3 font-label-sm text-sm text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t('Logging in...') : t('Login')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link className="font-medium text-primary" to="/forgot-password">
            {t('Forgot password?')}
          </Link>
        </div>

        <a
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 text-sm font-medium hover:bg-surface-container-low"
          href="/api/auth/google/start"
        >
          <Chrome className="h-4 w-4" />
          {t('Continue with Google')}
        </a>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          {t('No account yet?')}{' '}
          <Link className="font-medium text-primary" to="/register">
            {t('Create account')}
          </Link>
        </p>
        <p className="mt-8 text-center text-xs leading-5 text-on-surface-variant">
          {t('Study AI Now! is used only for course accounts, learning progress, and subscription management.')}
        </p>
      </div>
      </main>
    </div>
  );
}
