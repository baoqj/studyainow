// One-off verification: AdSense <ins> must render ONLY on substantive,
// public course lessons and interview questions — never on catalogs,
// chapter navigation, tools, account screens, legal pages, or error pages.
import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:4174';
const AD_SELECTOR = 'ins.adsbygoogle[data-ad-slot="4529179585"]';

const RESUME_PAYLOAD = {
  resume: {
    id: 'r1', name: 'My Resume', status: 'draft',
    profile: {
      personal: { fullName: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', targetRole: '' },
      summary: '', skills: [], experience: [], projects: [], education: [], certifications: [],
    },
    createdAt: '', updatedAt: '',
  },
  templates: [], versions: [], sources: [],
};

async function newPage(browser, signedIn) {
  const context = await browser.newContext();
  await context.addCookies([{ name: 'studyai_now_support_prompt_seen', value: '1', domain: '127.0.0.1', path: '/' }]);
  const page = await context.newPage();
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/me') {
      return route.fulfill({ json: signedIn ? { user: { id: 'u1', email: 'test@example.com', name: 'Test User' } } : { user: null } });
    }
    if (pathname.endsWith('/access')) return route.fulfill({ json: { authenticated: false, courseManaged: false, chapters: [] } });
    if (pathname === '/api/jobs') return route.fulfill({ json: { jobs: [], total: 0, facets: { countries: [], cities: [] } } });
    if (/^\/api\/resumes\/[^/]+\/bookmarked-jobs$/.test(pathname)) return route.fulfill({ json: { jobs: [] } });
    if (/^\/api\/resumes\/[^/]+$/.test(pathname)) return route.fulfill({ json: RESUME_PAYLOAD });
    return route.fulfill({ json: {} });
  });
  return { context, page };
}

const AD_PAGES = [
  '/courses/claude-code-guide/chapters/1/lessons/01-01',
  '/interviews/ai-engineering-progressive-assessment/levels/1/questions/1-1',
];
const NO_AD_PAGES = [
  '/',
  '/courses',
  '/interviews',
  '/jobs',
  '/jobs/frontend-engineer',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/courses/claude-code-guide',
  '/courses/claude-code-guide/chapters/1',
  '/interviews/ai-engineering-progressive-assessment',
  '/interviews/ai-engineering-progressive-assessment/levels/1',
  '/me/resume',
  '/login',
  '/register',
  '/definitely-not-real',
  '/courses/not-a-course',
];

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const failures = [];

try {
  for (const path of AD_PAGES) {
    const { context, page } = await newPage(browser, false);
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector(AD_SELECTOR, { timeout: 30_000 });
    const count = await page.locator(AD_SELECTOR).count();
    console.log(`${count > 0 ? 'PASS' : 'FAIL'} ad-present  ${path} (${count})`);
    if (count === 0) failures.push(path);
    await context.close();
  }

  for (const path of NO_AD_PAGES) {
    const { context, page } = await newPage(browser, false);
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(3000);
    const count = await page.locator(AD_SELECTOR).count();
    console.log(`${count === 0 ? 'PASS' : 'FAIL'} ad-absent   ${path} (${count})`);
    if (count > 0) failures.push(path);
    await context.close();
  }

  // Resume studio is auth-gated; render it with a signed-in mock user and
  // verify that this behavioral/tool screen remains ad-free.
  const { context, page } = await newPage(browser, true);
  await page.goto(BASE + '/me/resume/r1', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(3000);
  const studioCount = await page.locator(AD_SELECTOR).count();
  console.log(`${studioCount === 0 ? 'PASS' : 'FAIL'} ad-absent   /me/resume/r1 (${studioCount})`);
  if (studioCount > 0) failures.push('/me/resume/r1');
  await context.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('FAILED PAGES:', failures.join(', '));
  process.exit(1);
}
console.log('ALL PLACEMENT CHECKS PASSED');
