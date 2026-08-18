import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';
import { getAccountCopy } from '../../data/accountCopy';

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const copy = getAccountCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  const [state, setState] = useState<'loading' | 'signed_in' | 'signed_out'>('loading');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<{ user: unknown | null }>)
      .then((payload) => active && setState(payload.user ? 'signed_in' : 'signed_out'))
      .catch(() => active && setState('signed_out'));
    return () => { active = false; };
  }, []);

  if (state === 'loading') return <div className="min-h-screen bg-background pt-32 text-center text-on-surface-variant">{copy.loadingAccount}</div>;
  if (state === 'signed_out') return <Navigate to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;
  return <>{children}</>;
}
