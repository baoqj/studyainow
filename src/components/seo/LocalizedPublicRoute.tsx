import { useEffect, type ReactNode } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicLocaleFromSegment, type PublicLocale } from '../../lib/localeRoutes';
import { NotFound } from '../../pages/NotFound';

/**
 * Locale-prefixed public routes own the document language. The effect keeps
 * i18next and localStorage in sync after the URL has been established; it
 * never derives an indexable URL from a browser-only language preference.
 */
export function LocalizedPublicRoute() {
  const { locale: routeLocale } = useParams<{ locale: string }>();
  const { i18n } = useTranslation();
  const locale = publicLocaleFromSegment(routeLocale);

  useEffect(() => {
    if (locale && i18n.resolvedLanguage !== locale) void i18n.changeLanguage(locale);
  }, [i18n, locale]);

  if (!locale) return <NotFound />;

  return <LocaleMarker locale={locale}><Outlet /></LocaleMarker>;
}

function LocaleMarker({ locale, children }: { locale: PublicLocale; children: ReactNode }) {
  // Make the route locale available before descendant hooks render. This is a
  // synchronous external-store update, so it avoids briefly rendering Chinese
  // catalogue data on a direct /en/ navigation.
  const { i18n } = useTranslation();
  if (i18n.resolvedLanguage !== locale) void i18n.changeLanguage(locale);
  return <>{children}</>;
}
