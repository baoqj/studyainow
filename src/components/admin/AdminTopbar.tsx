import { ChevronDown, LogOut, Menu, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { logoutToLogin } from '../../lib/auth';

const titles: Array<[RegExp, string]> = [
  [/^\/admin\/my-organization/, '我的组织'],
  [/^\/admin\/organizations/, '组织管理'],
  [/^\/admin\/overview/, '概览'],
  [/^\/admin\/users/, '用户管理'],
  [/^\/admin\/courses/, '自有课程'],
  [/^\/admin\/community-courses/, '用户课程'],
  [/^\/admin\/interviews/, '面试题集'],
  [/^\/admin\/knowledge-graph/, '知识图谱'],
  [/^\/admin\/job-sources/, '职位来源'],
  [/^\/admin\/jobs/, '职位列表'],
  [/^\/admin\/settings/, '系统设置'],
];

type MePayload = { user: { display_name: string; email: string; roles?: string[] } | null };

export function AdminTopbar({ onMenu }: { onMenu: () => void }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<MePayload['user']>(null);
  const title = titles.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? '概览';

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    fetch('/api/auth/me', { headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<MePayload>)
      .then((payload) => setUser(payload.user))
      .catch(() => undefined);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(document.documentElement.classList.contains('dark'));
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-[#35618c] dark:bg-[#0c2949]/95 sm:px-6 xl:px-8">
      <button onClick={onMenu} className="mr-3 rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 dark:border-[#35618c] dark:text-blue-100 dark:hover:bg-[#173f69] lg:hidden" aria-label="打开主菜单">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      </div>
      <button
        onClick={toggleTheme}
        className="mr-2 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-800 dark:border-[#35618c] dark:bg-[#102f53] dark:text-blue-100 dark:hover:bg-[#173f69] dark:hover:text-white"
        aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        title={isDark ? '亮色模式' : '暗色模式'}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="relative">
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left hover:bg-blue-50 dark:border-[#35618c] dark:bg-[#102f53] dark:hover:bg-[#173f69] sm:px-3"
          aria-expanded={open}
          aria-label="账户菜单"
        >
          <span className="admin-primary-action flex h-7 w-7 items-center justify-center rounded"><UserRound className="h-4 w-4" /></span>
          <span className="hidden max-w-40 sm:block">
            <span className="block truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.display_name ?? 'Administrator'}</span>
            <span className="block truncate text-[10px] text-slate-500 dark:text-blue-200">{user?.email ?? 'StudyAINow'}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
        </button>
        {open ? (
          <>
            <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="关闭账户菜单" />
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-[#35618c] dark:bg-[#102f53]">
              <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 dark:text-blue-50 dark:hover:bg-[#173f69]">
                <Settings className="h-4 w-4" />{user?.roles?.includes('admin') ? '管理面板' : 'Leader 面板'}
              </Link>
              <Link to="/me" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 dark:text-blue-50 dark:hover:bg-[#173f69]">
                <UserRound className="h-4 w-4" />我的空间
              </Link>
              <Link to="/me/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 dark:text-blue-50 dark:hover:bg-[#173f69]">
                <Settings className="h-4 w-4" />个人设置
              </Link>
              <div className="my-1 border-t border-slate-100 dark:border-[#244d76]" />
              <button onClick={logoutToLogin} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-[#173f69]">
                <LogOut className="h-4 w-4" />退出登录
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
