import { Bell, BookOpen, BriefcaseBusiness, FilePenLine, FileText, Globe, LogOut, Moon, Newspaper, Search, Settings, Sun, User, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logoutToLogin } from '../../lib/auth';
import { APP_LOCALES } from '../../i18n';
import { SupportButton } from '../support/SupportButton';
import { BrandWordmark } from '../brand/BrandWordmark';
import { localePathForCurrentRoute, localizedPublicPath, type PublicLocale } from '../../lib/localeRoutes';
import type { AppLocale } from '../../data/courseContent';
import { getNavigationCopy } from '../../data/navigationCopy';
import logoTrans from '../../../../pics/Logo/logo-trans.png';

const LANGUAGES = APP_LOCALES;
export function Navbar({
  onMobileBrandClick,
  mobileBrandMenuOpen = false,
  onBrandClick,
  brandClickLabel = 'Study AI Now!',
}: {
  onMobileBrandClick?: () => void;
  mobileBrandMenuOpen?: boolean;
  onBrandClick?: () => void;
  brandClickLabel?: string;
} = {}) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getNavigationCopy(locale);
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ display_name: string; username: string | null; avatar_url: string | null } | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<{ user: typeof user }>)
      .then((payload) => {
        if (!active) return;
        setUser(payload.user);
        setAuthResolved(true);
        if (!payload.user) setIsDropdownOpen(false);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setAuthResolved(true);
        setIsDropdownOpen(false);
      });
    return () => { active = false; };
  }, [location.pathname]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const changeLanguage = (code: string) => {
    const nextLocale = code as PublicLocale;
    void i18n.changeLanguage(nextLocale);
    const pathname = localePathForCurrentRoute(location.pathname, nextLocale);
    if (pathname !== location.pathname) navigate({ pathname, search: location.search, hash: location.hash });
    setIsLangDropdownOpen(false);
  }

  const publicPath = (path: string) => localizedPublicPath(path, locale);
  const catalogPath = publicPath('/');

  const navLinkClass = (path: string) => {
    const destination = path === '/courses' ? catalogPath : publicPath(path);
    const active = path === '/courses'
      ? location.pathname === catalogPath || location.pathname === publicPath('/courses') || location.pathname.startsWith(`${catalogPath}/courses/`)
      : location.pathname === destination || location.pathname.startsWith(`${destination}/`);
    return [
      'font-label-sm text-label-sm tracking-tight flex items-center rounded-lg px-3 py-2 transition-colors duration-200',
      active
        ? 'bg-[#5d84ae] text-white dark:bg-[#142f55] dark:text-slate-300'
        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
    ].join(' ');
  };

  const userMenuItems = [
    { label: copy.member.dashboard, to: '/me', icon: User },
    { label: copy.member.courses, to: '/me/course', icon: BookOpen },
    { label: copy.member.creator, to: '/me/creator', icon: FilePenLine },
    { label: copy.member.resume, to: '/me/resume', icon: FileText },
    { label: copy.member.jobs, to: '/me/job', icon: BriefcaseBusiness },
    { label: copy.member.referrals, to: '/me/referral', icon: Users },
    { label: copy.member.notifications, to: '/me/notification', icon: Bell },
    { label: copy.member.settings, to: '/me/settings', icon: Settings },
  ];

  const avatarInitials = (user?.display_name || user?.username || 'AI').slice(0, 2).toUpperCase();
  // Before authentication resolves, use the protected route. RequireAuth will
  // preserve the intended destination if the visitor turns out to be signed out.
  const resumeDestination = (user || !authResolved)
    ? '/me/resume'
    : `/login?next=${encodeURIComponent('/me/resume')}`;

  return (
    <header className="fixed top-0 w-full z-50 border-b border-outline-variant shadow-sm bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5 md:gap-8">
          {onMobileBrandClick && <button
            type="button"
            onClick={onMobileBrandClick}
            aria-label={t('filter.open')}
            aria-haspopup="dialog"
            aria-expanded={mobileBrandMenuOpen}
            className="flex min-w-0 shrink items-center gap-2 text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-2.5 md:hidden"
          >
            <img src={logoTrans} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
            <BrandWordmark className="text-sm min-[360px]:text-base sm:text-xl" />
          </button>}
          {onBrandClick ? <button type="button" onClick={onBrandClick} aria-label={brandClickLabel} className={`min-w-0 shrink items-center gap-2 text-left text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-2.5 ${onMobileBrandClick ? 'hidden md:flex' : 'flex'}`}>
            <img src={logoTrans} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
            <BrandWordmark className="text-sm min-[360px]:text-base sm:text-xl" />
          </button> : <Link to={catalogPath} aria-label="Study AI Now!" className={`min-w-0 shrink items-center gap-2 text-on-surface sm:gap-2.5 ${onMobileBrandClick ? 'hidden md:flex' : 'flex'}`}>
            <img src={logoTrans} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
            <BrandWordmark className="text-sm min-[360px]:text-base sm:text-xl" />
          </Link>}
          <nav className="hidden h-full items-center gap-2 md:flex lg:gap-4 xl:gap-6">
            <Link to={catalogPath} className={navLinkClass('/courses')}>
              {copy.public.courses}
            </Link>
            <Link to={publicPath('/interviews')} className={navLinkClass('/interviews')}>
              {copy.public.interviews}
            </Link>
            <Link to={publicPath('/jobs')} className={navLinkClass('/jobs')}>
              {copy.public.jobs}
            </Link>
            <a href="https://news.studyai.now/" className={navLinkClass('/news')}>
              {copy.public.news}
            </a>
            <Link to={resumeDestination} className={navLinkClass('/me/resume')}>
              {copy.public.resume}
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
          <div className="relative hidden text-on-surface-variant focus-within:text-primary xl:flex">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
            <input
              className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none w-64 transition-all"
              placeholder={t('catalog.search')}
              type="text"
            />
          </div>
          <div className="hidden lg:block">
            <SupportButton />
          </div>

          <a
            href="https://news.studyai.now/"
            aria-label={copy.public.news}
            title={copy.public.news}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary md:hidden"
          >
            <Newspaper className="h-5 w-5" />
          </a>

          <Link
            to={resumeDestination}
            aria-label={copy.public.resume}
            title={copy.public.resume}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary md:hidden"
          >
            <FileText className="h-5 w-5" />
          </Link>
          
          <div className="relative">
            <button 
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors flex items-center"
              aria-label={t('nav.language')}
              aria-expanded={isLangDropdownOpen}
              aria-haspopup="menu"
            >
              <Globe className="w-5 h-5" />
            </button>

            {isLangDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsLangDropdownOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-32 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 py-2">
                  {LANGUAGES.map(lang => (
                    <button 
                      key={lang.code}
                      className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                      onClick={() => changeLanguage(lang.code)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button 
            onClick={toggleTheme}
            className="hidden min-[420px]:inline-flex text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {user ? (
            <div className="relative ml-1">
              <button
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-primary-container text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setIsDropdownOpen((open) => !open)}
                aria-label={t('Account menu')}
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
              >
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : avatarInitials}
              </button>

              {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                ></div>
                <div role="menu" className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-2 shadow-lg">
                  {userMenuItems.map((item) => {
                    const Icon = item.icon;
                    return <Link
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container-low"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Icon className="h-4 w-4 text-on-surface-variant" />
                      {item.label}
                    </Link>;
                  })}
                  <div className="h-px bg-outline-variant my-2"></div>
                  <button
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={logoutToLogin}
                  >
                    <LogOut className="w-4 h-4" />
                    {copy.member.logout}
                  </button>
                </div>
              </>
              )}
            </div>
          ) : (
            <div className="ml-1 flex items-center gap-2">
              <Link to="/register" className="hidden rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-container/35 sm:inline-flex">
                {copy.public.register}
              </Link>
              <Link
                to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {copy.public.login}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
