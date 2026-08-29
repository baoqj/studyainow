export const PUBLIC_LOCALES = ['zh-CN', 'zh-TW', 'en', 'fr', 'es'] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

const URL_LOCALE_SEGMENTS: Record<PublicLocale, string> = {
  'zh-CN': 'zh-cn',
  'zh-TW': 'zh-tw',
  en: 'en',
  fr: 'fr',
  es: 'es',
};

const LEGACY_LOCALE_SEGMENTS: Record<string, PublicLocale> = {
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  en: 'en',
  fr: 'fr',
  es: 'es',
};

const localePattern = /^\/([^/]+)(?=\/|$)/;

const LOCALIZED_PUBLIC_PATHS = [
  /^\/$/,
  /^\/courses(?:\/|$)/,
  /^\/topics(?:\/|$)/,
  /^\/interviews(?:\/|$)/,
  /^\/jobs(?:\/|$)/,
  /^\/(?:privacy|terms|about|contact|editorial-policy)$/,
];

export function isPublicLocale(value: string | undefined | null): value is PublicLocale {
  return Boolean(value && PUBLIC_LOCALES.includes(value as PublicLocale));
}

/** Converts either a canonical URL segment or the previous mixed-case form. */
export function publicLocaleFromSegment(value: string | undefined | null): PublicLocale | undefined {
  if (!value) return undefined;
  if (isPublicLocale(value)) return value;
  return LEGACY_LOCALE_SEGMENTS[value.toLowerCase()];
}

export function localeSegment(locale: PublicLocale) {
  return URL_LOCALE_SEGMENTS[locale];
}

export function normalizePathname(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeadingSlash.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

export function localeFromPathname(pathname: string): PublicLocale | undefined {
  const match = normalizePathname(pathname).match(localePattern);
  return publicLocaleFromSegment(match?.[1]);
}

export function withoutLocalePrefix(pathname: string) {
  const normalized = normalizePathname(pathname);
  const locale = localeFromPathname(normalized);
  if (!locale) return normalized;

  const remainder = normalized.slice(locale.length + 1);
  return remainder || '/';
}

export function isLocalizablePublicPath(pathname: string) {
  const path = withoutLocalePrefix(pathname);
  return LOCALIZED_PUBLIC_PATHS.some((pattern) => pattern.test(path));
}

/**
 * Public pages have an explicit locale prefix so a URL always identifies the
 * language of the document. Private account routes intentionally remain out
 * of this mapping.
 */
export function localizedPublicPath(pathname: string, locale: PublicLocale) {
  const path = withoutLocalePrefix(pathname);
  if (!isLocalizablePublicPath(path)) return path;
  const segment = localeSegment(locale);
  return path === '/' ? `/${segment}` : `/${segment}${path}`;
}

export function localePathForCurrentRoute(pathname: string, locale: PublicLocale) {
  return isLocalizablePublicPath(pathname) ? localizedPublicPath(pathname, locale) : normalizePathname(pathname);
}

/**
 * Canonical public content has a URL-owned language. The Worker uses this
 * before serving the SPA shell so crawlers never need localStorage or
 * Accept-Language to discover the document language. Jobs remain application
 * pages and intentionally retain their current URL/`noindex` behavior.
 */
export function canonicalPublicPathname(pathname: string) {
  const normalized = normalizePathname(pathname);
  const path = withoutLocalePrefix(normalized);
  const isSeoContent = path === '/' || /^\/courses(?:\/|$)/.test(path) || /^\/topics(?:\/|$)/.test(path) || /^\/interviews(?:\/|$)/.test(path) || /^\/(privacy|terms|about|contact|editorial-policy)$/.test(path);
  if (!isSeoContent) return undefined;
  const locale = localeFromPathname(normalized) ?? 'zh-CN';
  const contentPath = path === '/courses' ? '/' : path;
  const canonical = localizedPublicPath(contentPath, locale);
  return canonical === normalized ? undefined : canonical;
}
