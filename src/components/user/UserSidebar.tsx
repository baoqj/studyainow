import { LayoutDashboard, BookOpen, Users, Settings, FilePenLine, FileText, BriefcaseBusiness, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getNavigationCopy } from '../../data/navigationCopy';
import type { AppLocale } from '../../data/courseContent';
import { BrandWordmark } from '../brand/BrandWordmark';

export function UserSidebar() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const copy = getNavigationCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale).member;
  
  const navItems = [
    { name: copy.dashboard, icon: LayoutDashboard, path: '/me' },
    { name: copy.courses, icon: BookOpen, path: '/me/course' },
    { name: copy.creator, icon: FilePenLine, path: '/me/creator' },
    { name: copy.resume, icon: FileText, path: '/me/resume' },
    { name: copy.jobs, icon: BriefcaseBusiness, path: '/me/job' },
    { name: copy.referrals, icon: Users, path: '/me/referral' },
    { name: copy.notifications, icon: Bell, path: '/me/notification' },
  ];

  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest">
      <Link
        to="/"
        aria-label="Study AI Now!"
        className="flex h-20 items-center px-6 transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div>
          <h1 className="font-h3 leading-tight"><BrandWordmark className="text-[20px]" /></h1>
          <p className="mt-0.5 font-label-sm text-[13px] text-on-surface-variant">{copy.dashboard}</p>
        </div>
      </Link>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.path === '/me'
            ? location.pathname === item.path
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-sm transition-colors ${
                isActive 
                  ? 'bg-primary-container/10 text-primary font-medium' 
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-outline'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-outline-variant">
        <Link
          to="/me/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
        >
          <Settings className="w-5 h-5 text-outline" />
          {copy.settings}
        </Link>
      </div>
    </aside>
  );
}
