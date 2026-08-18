import { Bell, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';
import { getNavigationCopy } from '../../data/navigationCopy';
import { fetchAccountOverview, type AccountOverview } from '../../lib/account';

export function UserNotifications() {
  const { i18n } = useTranslation();
  const copy = getNavigationCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale).member;
  const [notifications, setNotifications] = useState<AccountOverview['notifications'] | null>(null);

  useEffect(() => {
    let active = true;
    fetchAccountOverview()
      .then((data) => active && setNotifications(data.notifications))
      .catch(() => active && setNotifications([]));
    return () => { active = false; };
  }, []);

  if (!notifications) return <div className="py-12 text-center text-on-surface-variant">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-3">
          <Bell className="h-7 w-7 text-primary" />
          <h1 className="font-h1 text-[32px] text-on-surface">{copy.notifications}</h1>
        </div>
        <p className="mt-2 text-on-surface-variant">{notifications.length ? `${notifications.length}` : '—'}</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        {notifications.map((notification) => (
          <Link
            key={notification.id}
            to={notification.action_url || '/me'}
            className="block border-b border-outline-variant px-6 py-5 transition-colors last:border-b-0 hover:bg-surface-container-low"
          >
            <div className="flex gap-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-semibold text-on-surface">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">{notification.body}</p>
                <p className="mt-2 text-xs text-outline">{new Date(notification.created_at).toLocaleString(i18n.resolvedLanguage ?? i18n.language)}</p>
              </div>
            </div>
          </Link>
        ))}
        {!notifications.length && <p className="px-6 py-14 text-center text-sm text-on-surface-variant">—</p>}
      </section>
    </div>
  );
}
