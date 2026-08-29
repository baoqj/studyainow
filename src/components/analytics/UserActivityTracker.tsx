import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

type AuthPayload = { user: { id: string } | null };
type AuthState = { status: 'loading' | 'anonymous' | 'authenticated'; userId: string | null };

function visiblePageTitle() {
  const heading = document.querySelector<HTMLElement>('main h1');
  const headingText = heading?.innerText.replace(/\s+/g, ' ').trim();
  return (headingText || document.title || 'Study AI Now!').slice(0, 200);
}

export function UserActivityTracker() {
  const location = useLocation();
  const [auth, setAuth] = useState<AuthState>({ status: 'loading', userId: null });
  const lastSent = useRef({ key: '', at: 0 });

  const refreshAuth = useCallback(() => {
    fetch('/api/auth/me', { headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<AuthPayload>)
      .then((payload) => setAuth(payload.user
        ? { status: 'authenticated', userId: payload.user.id }
        : { status: 'anonymous', userId: null }))
      .catch(() => setAuth({ status: 'anonymous', userId: null }));
  }, []);

  useEffect(refreshAuth, [refreshAuth]);

  useEffect(() => {
    if (auth.status !== 'anonymous') return;
    if (location.pathname === '/me' || location.pathname.startsWith('/me/') || location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
      refreshAuth();
    }
  }, [auth.status, location.pathname, refreshAuth]);

  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.userId) return;
    let sent = false;
    let fallbackTimer = 0;
    let settleTimer = 0;

    const send = () => {
      if (sent) return;
      sent = true;
      const key = `${auth.userId}:${location.pathname}`;
      const now = Date.now();
      if (lastSent.current.key === key && now - lastSent.current.at < 1_500) return;
      lastSent.current = { key, at: now };
      void fetch('/api/activity/page-view', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({ pageTitle: visiblePageTitle(), route: location.pathname }),
      }).catch(() => undefined);
    };

    const sendWhenReady = () => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading?.innerText.trim()) send();
    };

    const observer = new MutationObserver(sendWhenReady);
    observer.observe(document.body, { childList: true, subtree: true });
    settleTimer = window.setTimeout(sendWhenReady, 220);
    fallbackTimer = window.setTimeout(send, 3_000);

    return () => {
      observer.disconnect();
      window.clearTimeout(settleTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [auth.status, auth.userId, location.pathname]);

  return null;
}
