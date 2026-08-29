import { COURSE_SEO } from '../data/courseSeo';
import { isTopicSeoSlug, TOPIC_SEO, TOPIC_SEO_SLUGS } from '../data/topicSeo';
import type { PublicLocale } from './localeRoutes';

export const SEO_INDEXABLE_LOCALES = ['zh-CN', 'en'] as const satisfies readonly PublicLocale[];

const INDEXABLE_COURSES_BY_LOCALE: Record<PublicLocale, ReadonlySet<string>> = {
  'zh-CN': new Set(Object.keys(COURSE_SEO)),
  en: new Set(['claude-code-guide', 'hermes-agent-guide', 'codex-tutorial', 'forward-deployed-engineering']),
  'zh-TW': new Set(),
  fr: new Set(),
  es: new Set(),
};

export type SeoQuality = {
  score: number;
  rationale: string;
};

export type SeoPageType = 'home' | 'topic' | 'course' | 'about' | 'legal' | 'interview' | 'other';

export function seoPageType(pathname: string): SeoPageType {
  if (pathname === '/') return 'home';
  if (/^\/topics\/[^/]+$/.test(pathname)) return 'topic';
  if (/^\/courses\/[^/]+$/.test(pathname)) return 'course';
  if (pathname === '/about' || pathname === '/editorial-policy') return 'about';
  if (pathname === '/privacy' || pathname === '/terms') return 'legal';
  if (/^\/interviews\//.test(pathname) || pathname === '/interviews') return 'interview';
  return 'other';
}

/**
 * A deliberately small, reviewable gate.  A page is indexable only when the
 * record can name its intent, visible content, provenance and internal links.
 * It is a release guard, not a claim that search engines will index a page.
 */
export function getSeoQuality(pathname: string, locale: PublicLocale): SeoQuality {
  const type = seoPageType(pathname);
  if (type === 'home') return { score: SEO_INDEXABLE_LOCALES.includes(locale as 'zh-CN' | 'en') ? 9 : 0, rationale: 'Reviewed home copy, course links, visible purpose, and technical metadata.' };
  if (type === 'topic' && isTopicSeoSlug(pathname.split('/')[2])) return { score: SEO_INDEXABLE_LOCALES.includes(locale as 'zh-CN' | 'en') ? 9 : 0, rationale: 'Reviewed topic copy, course pathway, FAQ, and related interview link.' };
  if (type === 'course') {
    const courseId = pathname.split('/')[2];
    return INDEXABLE_COURSES_BY_LOCALE[locale].has(courseId)
      ? { score: 8, rationale: 'Published course with reviewed landing-page copy, curriculum links, and provenance fields.' }
      : { score: 0, rationale: 'The language version is browseable but not approved for search indexing.' };
  }
  if (type === 'about') return { score: SEO_INDEXABLE_LOCALES.includes(locale as 'zh-CN' | 'en') ? 8 : 0, rationale: 'Public, reviewed editorial and product information.' };
  if (type === 'legal') return { score: SEO_INDEXABLE_LOCALES.includes(locale as 'zh-CN' | 'en') ? 8 : 0, rationale: 'Public legal information with a stable canonical URL.' };
  return { score: 0, rationale: 'Not a reviewed public SEO landing page.' };
}

export function isSeoIndexable(pathname: string, locale: PublicLocale) {
  return getSeoQuality(pathname, locale).score >= 8;
}

export function indexableLocalesForPath(pathname: string): PublicLocale[] {
  return SEO_INDEXABLE_LOCALES.filter((locale) => isSeoIndexable(pathname, locale));
}

export function getIndexableCourseIds(locale: PublicLocale) {
  return [...INDEXABLE_COURSES_BY_LOCALE[locale]];
}

export function getIndexableTopicSlugs(locale: PublicLocale) {
  return SEO_INDEXABLE_LOCALES.includes(locale as 'zh-CN' | 'en') ? TOPIC_SEO_SLUGS : [];
}

export const SEO_TOPICS = TOPIC_SEO;
