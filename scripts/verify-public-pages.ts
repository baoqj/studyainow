import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/components/layout/Footer.tsx', import.meta.url), 'utf8');
const courseFooter = readFileSync(new URL('../src/components/course/CourseFooter.tsx', import.meta.url), 'utf8');
const legalPage = readFileSync(new URL('../src/pages/LegalPage.tsx', import.meta.url), 'utf8');
const aboutPage = readFileSync(new URL('../src/pages/About.tsx', import.meta.url), 'utf8');
const contactPage = readFileSync(new URL('../src/pages/Contact.tsx', import.meta.url), 'utf8');
const publicCopy = readFileSync(new URL('../src/data/publicInfoCopy.ts', import.meta.url), 'utf8');
const contactApi = readFileSync(new URL('../functions/api/contact.ts', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0031_contact_rate_limits.sql', import.meta.url), 'utf8');
const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../src/data/courseCatalog.ts', import.meta.url), 'utf8');

for (const route of ['/privacy', '/terms', '/about', '/contact']) {
  assert.match(app, new RegExp(`<Route path="${route}"`), `missing public ${route} route`);
  assert.match(sitemap, new RegExp(`<loc>https://studyai\\.now${route}</loc>`), `sitemap is missing ${route}`);
}
assert.match(sitemap, /<loc>https:\/\/studyai\.now\/jobs<\/loc>/, 'sitemap is missing the public jobs route');

for (const locale of ["'zh-CN'", "'zh-TW'", 'en:', 'fr:', 'es:']) {
  assert.match(publicCopy, new RegExp(locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `public-information copy is missing ${locale}`);
}

assert.match(legalPage, /getPublicInfoCopy/, 'legal pages must use the locale-aware public copy');
assert.match(aboutPage, /getPublicInfoCopy/, 'about page must use the locale-aware public copy');
assert.match(contactPage, /getPublicInfoCopy/, 'contact page must use the locale-aware public copy');
assert.match(contactPage, /fetch\('\/api\/contact'/, 'contact page must submit to the public contact API');
assert.match(contactPage, /studyainow@mail\.com/, 'contact page must expose the support address');

for (const component of [footer, courseFooter]) {
  for (const route of ['/courses', '/jobs', '/privacy', '/terms', '/about', '/contact']) {
    assert.match(component, new RegExp(`to="${route}"`), `footer navigation is missing ${route}`);
  }
}

assert.match(robots, /^User-agent:\s*\*/m, 'robots.txt needs a Google-compatible user-agent rule');
assert.match(robots, /^Allow:\s*\/$/m, 'robots.txt must allow public pages');
assert.doesNotMatch(robots, /^Disallow:\s*\/$/m, 'robots.txt must not block the site root');

assert.match(contactApi, /sendEmail\(env/, 'contact API must use the Resend transport');
assert.match(contactApi, /replyTo:\s*email/, 'contact API must reply to the visitor address');
assert.match(contactApi, /studyainow@mail\.com/, 'contact API must send to the support mailbox');
assert.match(contactApi, /contact_rate_limits/, 'contact API must rate-limit public submissions');
assert.match(worker, /pathname === '\/api\/contact'/, 'worker must route contact submissions');
assert.match(migration, /CREATE TABLE IF NOT EXISTS contact_rate_limits/, 'contact rate-limit table is missing');

const courseIds = catalog.match(/\{ id: '/g) ?? [];
assert.ok(courseIds.length >= 18, `expected at least 18 original courses, found ${courseIds.length}`);
assert.match(catalog, /const aiSeeds/, 'the original AI course collection is missing');

console.log(JSON.stringify({
  publicRoutes: 4,
  originalCourses: courseIds.length,
  locales: 5,
  robotsAllowsGoogle: true,
  contactForm: true,
}));
