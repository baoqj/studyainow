import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { getCourseSeoCopy } from '../src/data/courseSeo';
import { canonicalPublicPathname, localizedPublicPath } from '../src/lib/localeRoutes';
import { getRouteBootstrapHtml, getRouteMetadata } from '../src/lib/routeMetadata';

const courseId = 'claude-code-guide';
const paths = [
  { locale: 'zh-CN' as const, path: '/zh-cn/courses/claude-code-guide', expectedTitle: 'Claude Code 实战指南', indexable: true },
  { locale: 'en' as const, path: '/en/courses/claude-code-guide', expectedTitle: 'Claude Code: Practical Guide', indexable: true },
  { locale: 'fr' as const, path: '/fr/courses/claude-code-guide', expectedTitle: 'Guide pratique de Claude Code', indexable: false },
];

for (const entry of paths) {
  const metadata = getRouteMetadata(entry.path);
  const course = getCourseSeoCopy(courseId, entry.locale);
  const bootstrapHtml = getRouteBootstrapHtml(entry.path);

  assert.ok(course, `${entry.locale} course metadata must exist`);
  assert.equal(course.title, entry.expectedTitle, `${entry.locale} course title must be localised`);
  assert.equal(metadata.language, entry.locale, `${entry.locale} metadata language must match its URL`);
  assert.equal(metadata.canonical, `https://studyai.now${entry.path}`, `${entry.locale} canonical must use its lower-case language segment`);
  assert.equal(metadata.robots, entry.indexable ? 'index,follow' : 'noindex,nofollow');
  if (entry.indexable) {
    assert.equal(metadata.alternates.length, 3, `${entry.locale} has zh-CN, en, and x-default alternates`);
    assert.match(bootstrapHtml, new RegExp(entry.expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${entry.locale} server HTML must include the reviewed H1`);
    assert.match(bootstrapHtml, /data-studyainow-static="true"/, `${entry.locale} must expose semantic server content`);
  } else {
    assert.equal(metadata.alternates.length, 0, 'unreviewed translated pages must not publish hreflang alternates');
    assert.equal(bootstrapHtml, '', 'unreviewed translated pages must not publish a thin server document');
  }
}

assert.equal(localizedPublicPath('/courses/claude-code-guide', 'zh-CN'), '/zh-cn/courses/claude-code-guide');
assert.equal(canonicalPublicPathname('/courses/claude-code-guide'), '/zh-cn/courses/claude-code-guide');
assert.equal(canonicalPublicPathname('/zh-CN/courses/claude-code-guide'), '/zh-cn/courses/claude-code-guide');
assert.equal(getRouteMetadata('/en/courses').canonical, 'https://studyai.now/en', 'duplicate catalogue URL must canonicalise to the language root');
assert.equal(getRouteMetadata('/en/courses/claude-code-guide/chapters/01').robots, 'noindex,nofollow', 'lesson URLs wait for exact reviewed titles and content');

const sitemapIndex = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const sitemapZh = readFileSync(new URL('../public/sitemaps/sitemap-courses-zh-cn.xml', import.meta.url), 'utf8');
const sitemapEn = readFileSync(new URL('../public/sitemaps/sitemap-courses-en.xml', import.meta.url), 'utf8');
assert.match(sitemapIndex, /sitemap-courses-zh-cn\.xml/);
assert.match(sitemapIndex, /sitemap-courses-en\.xml/);
assert.match(sitemapZh, /<loc>https:\/\/studyai\.now\/zh-cn\/courses\/claude-code-guide<\/loc>/);
assert.match(sitemapEn, /<loc>https:\/\/studyai\.now\/en\/courses\/claude-code-guide<\/loc>/);
assert.doesNotMatch(sitemapIndex, /zh-CN|zh-TW/, 'canonical URL segments must remain lower-case');
assert.doesNotMatch(sitemapZh + sitemapEn, /\/fr\//, 'unreviewed French content must stay out of the sitemap');

console.log(JSON.stringify({
  indexableLocales: ['zh-CN', 'en'],
  courseId,
  hreflangPerIndexableRoute: 3,
  lowerCaseLocaleSegments: true,
  reviewedOnly: true,
}));
