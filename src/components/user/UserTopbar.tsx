import { Search, Globe, Moon, Sun, Bell, User, Settings, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logoutToLogin } from '../../lib/auth';
import { APP_LOCALES } from '../../i18n';
import { getNavigationCopy } from '../../data/navigationCopy';
import type { AppLocale } from '../../data/courseContent';

const LANGUAGES = APP_LOCALES;

export function UserTopbar() {
  const { t, i18n } = useTranslation();
  const copy = getNavigationCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale).member;
  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsLangDropdownOpen(false);
  }

  return (
    <header className="h-20 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-8 flex-shrink-0">
      <div className="flex-1 flex max-w-2xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
          <input
            className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all font-body-md"
            placeholder={t('Search courses, chapters, CLI Lab...')}
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 ml-8 relative">
        <div className="relative">
          <button 
            className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center relative"
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
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
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <Link to="/me/notification" className="relative text-on-surface-variant transition-colors hover:text-on-surface" aria-label={copy.notifications}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-surface-container-lowest"></span>
        </Link>
        
        <div className="relative">
          <button 
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface-container-highest bg-surface-container-low text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-label={t('User menu')}
          >
            <User className="h-4 w-4" />
          </button>
          
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 py-2">
                <Link 
                  to="/me" 
                  className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <User className="w-4 h-4" />
                  {copy.dashboard}
                </Link>
                <Link 
                  to="/me/settings" 
                  className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  {copy.settings}
                </Link>
                <div className="h-px bg-outline-variant my-2"></div>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  onClick={logoutToLogin}
                >
                  <LogOut className="w-4 h-4" />
                  {copy.logout}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
