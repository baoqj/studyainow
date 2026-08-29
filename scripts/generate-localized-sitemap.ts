import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getIndexableCourseIds, getIndexableTopicSlugs, SEO_INDEXABLE_LOCALES } from '../src/lib/seoRegistry';
import { localizedPublicPath, type PublicLocale } from '../src/lib/localeRoutes';
import { getRouteMetadata } from '../src/lib/routeMetadata';

const origin = 'https://studyai.now';
const publicDir = resolve(import.meta.dirname, '../public');
const sitemapDir = resolve(publicDir, 'sitemaps');

type SitemapEntry = { path: string; locale: PublicLocale };

function xmlEscape(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[character] ?? character);
}

function urlEntry({ path, locale }: SitemapEntry) {
  const metadata = getRouteMetadata(localizedPublicPath(path, locale));
  if (metadata.robots !== 'index,follow') throw new Error(`Sitemap candidate is not indexable: ${path} (${locale})`);
  const alternates = metadata.alternates.map((alternate) => (
    `    <xhtml:link rel="alternate" hreflang="${xmlEscape(alternate.hreflang)}" href="${xmlEscape(alternate.href)}" />`
  )).join('\n');
  return `  <url>\n    <loc>${xmlEscape(metadata.canonical)}</loc>\n${alternates}\n  </url>`;
}

function urlset(entries: SitemapEntry[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(urlEntry),
    '</urlset>',
    '',
  ].join('\n');
}

const pages: SitemapEntry[] = SEO_INDEXABLE_LOCALES.flatMap((locale) => [
  { path: '/', locale },
  { path: '/about', locale },
  { path: '/editorial-policy', locale },
  { path: '/privacy', locale },
  { path: '/terms', locale },
  ...getIndexableTopicSlugs(locale).map((slug) => ({ path: `/topics/${slug}`, locale })),
]);

const courseSitemaps = SEO_INDEXABLE_LOCALES.map((locale) => ({
  filename: `sitemap-courses-${locale === 'zh-CN' ? 'zh-cn' : locale}.xml`,
  entries: getIndexableCourseIds(locale).map((courseId) => ({ path: `/courses/${courseId}`, locale })),
}));

mkdirSync(sitemapDir, { recursive: true });
writeFileSync(resolve(sitemapDir, 'sitemap-pages.xml'), urlset(pages), 'utf8');
for (const sitemap of courseSitemaps) writeFileSync(resolve(sitemapDir, sitemap.filename), urlset(sitemap.entries), 'utf8');

const sitemapFiles = ['sitemap-pages.xml', ...courseSitemaps.filter((sitemap) => sitemap.entries.length > 0).map((sitemap) => sitemap.filename)];
const index = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapFiles.map((filename) => `  <sitemap><loc>${origin}/sitemaps/${filename}</loc></sitemap>`),
  '</sitemapindex>',
  '',
].join('\n');
writeFileSync(resolve(publicDir, 'sitemap.xml'), index, 'utf8');

console.log(JSON.stringify({
  sitemapIndex: sitemapFiles.length,
  pages: pages.length,
  courses: courseSitemaps.reduce((total, sitemap) => total + sitemap.entries.length, 0),
  locales: SEO_INDEXABLE_LOCALES,
}));
