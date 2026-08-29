import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type AccountPayload = { user: { roles?: string[] } | null };

export function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<'loading' | 'signed_out' | 'forbidden' | 'allowed'>('loading');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<AccountPayload>)
      .then((payload) => {
        if (!active) return;
        if (!payload.user) setState('signed_out');
        else setState(payload.user.roles?.some((role) => role === 'admin' || role === 'leader') ? 'allowed' : 'forbidden');
      })
      .catch(() => active && setState('signed_out'));
    return () => { active = false; };
  }, []);

  if (state === 'loading') return <div className="min-h-screen bg-background pt-32 text-center text-on-surface-variant">Loading…</div>;
  if (state === 'signed_out') return <Navigate to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;
  if (state === 'forbidden') return <Navigate to="/me" replace />;
  return <>{children}</>;
}
