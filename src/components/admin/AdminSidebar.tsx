import {
  BookOpenCheck,
  BriefcaseBusiness,
  DatabaseZap,
  Building2,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Settings2,
  UserRoundCog,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BrandWordmark } from '../brand/BrandWordmark';

const administratorItems = [
  { label: '概览', icon: LayoutDashboard, path: '/admin/overview' },
  { label: '用户管理', icon: UsersRound, path: '/admin/users' },
  { label: '组织管理', icon: Building2, path: '/admin/organizations' },
  { label: '自有课程', icon: BookOpenCheck, path: '/admin/courses' },
  { label: '用户课程', icon: UserRoundCog, path: '/admin/community-courses' },
  { label: '知识图谱', icon: Network, path: '/admin/knowledge-graph' },
  { label: '职位来源', icon: DatabaseZap, path: '/admin/job-sources' },
  { label: '职位列表', icon: BriefcaseBusiness, path: '/admin/jobs' },
  { label: '系统设置', icon: Settings2, path: '/admin/settings' },
];

const leaderItems = [
  { label: '我的组织', icon: Building2, path: '/admin/my-organization' },
  { label: '组织用户', icon: UsersRound, path: '/admin/my-organization?tab=members' },
  { label: '组织消息', icon: MessageSquareText, path: '/admin/my-organization?tab=messages' },
  { label: '自有课程', icon: BookOpenCheck, path: '/admin/courses' },
  { label: '职位列表', icon: BriefcaseBusiness, path: '/admin/jobs' },
];

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const [isAdministrator, setIsAdministrator] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/auth/me', { headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<{ user: { roles?: string[] } | null }>)
      .then((payload) => setIsAdministrator(Boolean(payload.user?.roles?.includes('admin'))))
      .catch(() => setIsAdministrator(false));
  }, []);
  const navItems = isAdministrator === null ? [] : isAdministrator ? administratorItems : leaderItems;
  const currentTab = new URLSearchParams(location.search).get('tab');
  const isActiveItem = (path: string) => {
    const [pathname, search = ''] = path.split('?');
    const itemTab = new URLSearchParams(search).get('tab');
    if (pathname === '/admin/my-organization') {
      if (itemTab) return location.pathname === pathname && currentTab === itemTab;
      return location.pathname === pathname && currentTab !== 'members' && currentTab !== 'messages';
    }
    if (pathname === '/admin/overview') return location.pathname === pathname;
    return location.pathname === pathname || location.pathname.startsWith(`${pathname}/`);
  };
  return (
    <>
      <button
        aria-label="关闭主菜单"
        onClick={onClose}
        className={`admin-overlay fixed inset-0 z-40 transition-opacity lg:hidden ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside className={`admin-sidebar-surface fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r border-blue-300/25 shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <NavLink to="/admin" onClick={onClose} aria-label="Study AI Now 管理面板" className="text-[17px] text-white">
            <BrandWordmark />
          </NavLink>
          <button onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="关闭主菜单">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/70">{isAdministrator === false ? 'Leader console' : 'Admin console'}</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="管理员主菜单">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              end={item.path === '/admin/overview' || item.path === '/admin/my-organization'}
              to={item.path}
              onClick={onClose}
              className={() => `group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActiveItem(item.path) ? 'bg-blue-100 font-semibold text-[#123a5f]' : 'text-blue-100/85 hover:bg-blue-400/20 hover:text-white'}`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs font-medium text-blue-100">StudyAINow</p>
          <p className="mt-1 text-[11px] text-blue-200/65">Operations · Toronto</p>
        </div>
      </aside>
    </>
  );
}
