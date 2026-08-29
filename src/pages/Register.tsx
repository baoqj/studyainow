import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Chrome, Lock, Mail, UserRound } from 'lucide-react';
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
  invitation?: {
    joined?: boolean;
    organization_name?: string;
    message?: string;
  };
  error?: string;
}

type InviteValidation = { valid: boolean; organization?: { name: string }; message?: string };

export function Register() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState(() => searchParams.get('invite') ?? '');
  const [inviteResult, setInviteResult] = useState<InviteValidation | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  async function validateInvite(rawCode = invite) {
    const code = rawCode.trim();
    if (!code) {
      setInviteResult(null);
      return;
    }
    setCheckingInvite(true);
    try {
      const response = await fetch('/api/auth/invites/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invite: code }),
      });
      const data = await response.json().catch(() => ({})) as InviteValidation & { error?: string };
      setInviteResult(response.ok ? data : { valid: false, message: data.error ?? '邀请码暂时无法验证。' });
    } catch {
      setInviteResult({ valid: false, message: '邀请码暂时无法验证。' });
    } finally {
      setCheckingInvite(false);
    }
  }

  useEffect(() => {
    const code = searchParams.get('invite');
    if (code) void validateInvite(code);
    // The invitation URL is the only auto-validation trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, email, password, passwordConfirm, invite: invite.trim() || undefined, locale: i18n.resolvedLanguage ?? i18n.language }),
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
            <span className="mb-1.5 block text-sm font-medium">组织邀请码（选填）</span>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  value={invite}
                  onChange={(event) => { setInvite(event.target.value); setInviteResult(null); }}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm uppercase outline-none focus:ring-2 focus:ring-primary"
                  placeholder="INV-..."
                  autoComplete="off"
                />
              </div>
              <button type="button" disabled={checkingInvite || !invite.trim()} onClick={() => void validateInvite()} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium text-primary disabled:opacity-50">
                {checkingInvite ? '验证中' : '验证'}
              </button>
            </div>
            {inviteResult && (
              <p className={`mt-2 text-sm ${inviteResult.valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                {inviteResult.valid ? `将加入：${inviteResult.organization?.name ?? ''}` : inviteResult.message}
              </p>
            )}
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
              {result.invitation?.joined && <p className="mt-2 font-medium">已加入组织：{result.invitation.organization_name}</p>}
              {result.invitation && !result.invitation.joined && <p className="mt-2 text-amber-800">{result.invitation.message}</p>}
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
          href={`/api/auth/google/start${invite.trim() ? `?invite=${encodeURIComponent(invite.trim())}` : ''}`}
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
        <p className="mt-5 text-center text-xs leading-5 text-on-surface-variant">邀请码仅用于加入所属组织，不影响你的普通注册、学习功能和个人资料。</p>
      </div>
      </main>
    </div>
  );
}
