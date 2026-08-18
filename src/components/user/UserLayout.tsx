import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserSidebar } from './UserSidebar';
import { UserTopbar } from './UserTopbar';
import type { AppLocale } from '../../data/courseContent';
import { getAccountCopy } from '../../data/accountCopy';
import { MemberRouteBoundary } from './MemberRouteBoundary';

function MemberRouteOutlet() {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const copy = getAccountCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  return <MemberRouteBoundary key={location.pathname} message={copy.memberPageLoadFailed} retryLabel={copy.retry} returnLabel={copy.returnToCourses} onReturnToCourses={() => navigate('/')}><Outlet /></MemberRouteBoundary>;
}

export function UserLayout() {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <UserSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <UserTopbar />
        <main className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="p-5 sm:p-8">
            <MemberRouteOutlet />
          </div>
        </main>
      </div>
    </div>
  );
}
