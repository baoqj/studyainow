import { expect, test, type Page } from '@playwright/test';

async function mockPublicApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/me') return route.fulfill({ json: { user: null } });
    if (pathname === '/api/jobs') return route.fulfill({ json: { jobs: [], total: 0, facets: { countries: [], cities: [] } } });
    return route.fulfill({ status: 200, json: {} });
  });
}

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name: 'studyai_now_support_prompt_seen', value: '1', domain: '127.0.0.1', path: '/' }]);
  await mockPublicApi(page);
});

test('public information pages render with clear navigation and no page errors', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  for (const path of ['/privacy', '/terms', '/about', '/contact']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer a[href="/courses"]')).toBeVisible();
    await expect(page.locator('footer a[href="/jobs"]')).toBeVisible();
    await expect(page.locator('footer a[href="/about"]')).toBeVisible();
    await expect(page.locator('footer a[href="/contact"]')).toBeVisible();
  }

  await page.goto('/contact');
  await expect(page.locator('a[href="mailto:studyainow@mail.com"]').first()).toBeVisible();
  await expect(page.locator('form')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('privacy and terms use the selected one of five interface languages', async ({ page }) => {
  const expectedPrivacyTitles = {
    'zh-CN': '隐私政策',
    'zh-TW': '隱私權政策',
    en: 'Privacy Policy',
    fr: 'Politique de confidentialité',
    es: 'Política de privacidad',
  } as const;

  for (const [locale, title] of Object.entries(expectedPrivacyTitles)) {
    await page.goto('/privacy');
    await page.evaluate((selectedLocale) => window.localStorage.setItem('studyai.now.locale', selectedLocale), locale);
    await page.reload();
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  }
});

test('support prompt offers both QR-code and Stripe donation methods', async ({ page }) => {
  await page.goto('/courses');
  await page.evaluate(() => window.dispatchEvent(new Event('studyai-now:open-support-prompt')));

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveCount(2);
  await expect(dialog.getByTestId('support-qr-wechat')).toBeVisible();
  await expect(dialog.getByTestId('support-qr-alipay')).toBeVisible();
  await expect(dialog.locator('button').filter({ hasText: /\$2/ })).toBeVisible();

  const footerSupportButton = page.locator('footer').getByTestId('support-button');
  await expect(footerSupportButton).toHaveClass(/whitespace-nowrap/);
});

test('public course, jobs, and resume URLs recover without a blank page', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/courses/claude-code-guide');
  // The course body is deliberately lazy-loaded. The visible route fallback
  // is valid while Vite transforms the large course-content module locally.
  await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });

  await page.goto('/jobs');
  await expect(page.locator('main')).toBeVisible();

  await page.goto('/resume');
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator('main')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
