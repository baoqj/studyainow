// Live-site AdSense policy verification: content pages must expose exactly one
// configured manual placement; non-content screens must not load AdSense at all.
import { chromium } from '@playwright/test';

const PAGES = [
  { path: '/courses/claude-code-guide/chapters/1/lessons/01-01', expectsAd: true },
  { path: '/interviews/ai-engineering-progressive-assessment/levels/1/questions/1-1', expectsAd: true },
  { path: '/courses/claude-code-guide/chapters/1', expectsAd: false },
  { path: '/login', expectsAd: false },
  { path: '/privacy', expectsAd: false },
  { path: '/me/resume', expectsAd: false },
  { path: '/definitely-not-real', expectsAd: false },
  { path: '/courses/not-a-course', expectsAd: false },
];

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const failures = [];

try {
  for (const test of PAGES) {
    const context = await browser.newContext();
    await context.addCookies([{ name: 'studyai_now_support_prompt_seen', value: '1', domain: 'studyai.now', path: '/' }]);
    const page = await context.newPage();
    const adRequests = [];
    const cspErrors = [];

    page.on('request', (request) => {
      if (/pagead2\.googlesyndication|doubleclick|googlesyndication/.test(request.url())) adRequests.push(request.url());
    });
    page.on('console', (message) => {
      if (/Content Security|CSP|refused/i.test(message.text())) cspErrors.push(message.text());
    });

    const response = await page.goto(`https://studyai.now${test.path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(5_000);

    const result = await page.evaluate(() => ({
      allAds: document.querySelectorAll('ins.adsbygoogle').length,
      loader: Boolean(document.querySelector('#studyainow-adsense-loader')),
      manualAds: document.querySelectorAll('ins.adsbygoogle[data-ad-slot="4529179585"]').length,
      title: document.title,
      url: location.href,
    }));
    const passed = test.expectsAd
      ? result.manualAds === 1 && result.loader && adRequests.length > 0 && cspErrors.length === 0
      : result.allAds === 0 && !result.loader && adRequests.length === 0;

    console.log(JSON.stringify({
      path: test.path,
      status: response?.status(),
      expectsAd: test.expectsAd,
      passed,
      adRequests: adRequests.length,
      cspErrors: cspErrors.length,
      ...result,
    }));
    if (!passed) failures.push(test.path);
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`LIVE ADSENSE POLICY CHECK FAILED: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('LIVE ADSENSE POLICY CHECK PASSED');
