import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { getTopicSeoCopy } from '../src/data/topicSeo';
import { canonicalPublicPathname, localizedPublicPath } from '../src/lib/localeRoutes';
import { getIndexableCourseIds, getSeoQuality, SEO_INDEXABLE_LOCALES } from '../src/lib/seoRegistry';
import { getRouteBootstrapHtml, getRouteMetadata } from '../src/lib/routeMetadata';

assert.equal(localizedPublicPath('/', 'zh-CN'), '/zh-cn');
assert.equal(localizedPublicPath('/courses/claude-code-guide', 'zh-TW'), '/zh-tw/courses/claude-code-guide');
assert.equal(canonicalPublicPathname('/'), '/zh-cn');
assert.equal(canonicalPublicPathname('/courses/claude-code-guide'), '/zh-cn/courses/claude-code-guide');
assert.equal(canonicalPublicPathname('/zh-CN/topics/claude-code'), '/zh-cn/topics/claude-code');
assert.equal(canonicalPublicPathname('/jobs'), undefined, 'jobs remain an application/noindex route');

const englishTopic = getRouteMetadata('/en/topics/claude-code');
const englishTopicCopy = getTopicSeoCopy('claude-code', 'en')!;
const englishTopicHtml = getRouteBootstrapHtml('/en/topics/claude-code');
assert.equal(englishTopic.canonical, 'https://studyai.now/en/topics/claude-code');
assert.equal(englishTopic.robots, 'index,follow');
assert.equal(englishTopic.alternates.length, 3, 'indexable topic has zh-CN, en, and x-default alternates');
assert.match(englishTopicHtml, new RegExp(englishTopicCopy.h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(englishTopicHtml, new RegExp(englishTopicCopy.faqs[0].question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(JSON.stringify(englishTopic.structuredData), /CollectionPage/);
assert.match(JSON.stringify(englishTopic.structuredData), /FAQPage/);

const chineseCourse = getRouteMetadata('/zh-cn/courses/agent-engineering');
const englishCourse = getRouteMetadata('/en/courses/agent-engineering');
const frenchCourse = getRouteMetadata('/fr/courses/claude-code-guide');
const englishLesson = getRouteMetadata('/en/courses/claude-code-guide/chapters/01/lessons/01-01');
assert.equal(chineseCourse.robots, 'index,follow');
assert.equal(englishCourse.robots, 'noindex,nofollow', 'unreviewed English course content is not promoted to search');
assert.equal(frenchCourse.robots, 'noindex,nofollow', 'browseable non-pilot locales remain out of the index');
assert.equal(englishLesson.robots, 'noindex,nofollow', 'lesson indexing waits for exact title/body records');
assert.equal(getSeoQuality('/topics/agent-engineering', 'en').score, 9);
assert.equal(getSeoQuality('/courses/agent-engineering', 'en').score, 0);

const root = getRouteMetadata('/zh-cn');
assert.equal(root.robots, 'index,follow');
assert.match(JSON.stringify(root.structuredData), /Organization/);
assert.match(JSON.stringify(root.structuredData), /WebSite/);

const editorial = getRouteMetadata('/en/editorial-policy');
const editorialHtml = getRouteBootstrapHtml('/en/editorial-policy');
assert.equal(editorial.robots, 'index,follow');
assert.match(editorialHtml, /Study AI Now! editorial and review policy/);
assert.match(editorialHtml, /Use of AI assistance/);

const sitemapIndex = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const sitemapPages = readFileSync(new URL('../public/sitemaps/sitemap-pages.xml', import.meta.url), 'utf8');
const sitemapZh = readFileSync(new URL('../public/sitemaps/sitemap-courses-zh-cn.xml', import.meta.url), 'utf8');
const sitemapEn = readFileSync(new URL('../public/sitemaps/sitemap-courses-en.xml', import.meta.url), 'utf8');
assert.match(sitemapIndex, /sitemap-pages\.xml/);
assert.match(sitemapIndex, /sitemap-courses-zh-cn\.xml/);
assert.match(sitemapIndex, /sitemap-courses-en\.xml/);
assert.match(sitemapPages, /https:\/\/studyai\.now\/en\/topics\/claude-code/);
assert.match(sitemapPages, /https:\/\/studyai\.now\/en\/editorial-policy/);
assert.doesNotMatch(sitemapPages, /\/fr\//);
assert.match(sitemapZh, /\/zh-cn\/courses\/agent-engineering/);
assert.doesNotMatch(sitemapEn, /\/en\/courses\/agent-engineering/);
assert.equal((sitemapZh.match(/<loc>/g) ?? []).length, getIndexableCourseIds('zh-CN').length);
assert.equal((sitemapEn.match(/<loc>/g) ?? []).length, getIndexableCourseIds('en').length);

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const routeMetadataComponent = readFileSync(new URL('../src/components/seo/RouteMetadata.tsx', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const supportPrompt = readFileSync(new URL('../src/components/support/SupportPrompt.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(indexHtml, /name="keywords"/i);
assert.match(routeMetadataComponent, /querySelector\('meta\[name="keywords"\]'\)\?\.remove/);
assert.doesNotMatch(worker, /on\('meta\[name="keywords"\]'/);
assert.match(worker, /canonicalPublicPathname/);
assert.match(worker, /status: 301/);
assert.doesNotMatch(supportPrompt, /setTimeout\(/, 'support must not auto-open and interrupt a public landing page');
assert.match(supportPrompt, /SUPPORT_PROMPT_EVENT/, 'support remains available after an explicit visitor action');

console.log(JSON.stringify({
  indexableLocales: SEO_INDEXABLE_LOCALES,
  sitemapCourseUrls: getIndexableCourseIds('zh-CN').length + getIndexableCourseIds('en').length,
  topicAlternates: englishTopic.alternates.length,
  qualityGate: '8/10',
}));
