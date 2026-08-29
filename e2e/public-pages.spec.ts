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

  for (const path of ['/zh-cn/privacy', '/zh-cn/terms', '/zh-cn/about', '/zh-cn/contact']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer a[href="/zh-cn"]')).toBeVisible();
    await expect(page.locator('footer a[href="/zh-cn/jobs"]')).toBeVisible();
    await expect(page.locator('footer a[href="/zh-cn/about"]')).toBeVisible();
    await expect(page.locator('footer a[href="/zh-cn/contact"]')).toBeVisible();
  }

  await page.goto('/zh-cn/contact');
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

  const localeSegments = { 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw', en: 'en', fr: 'fr', es: 'es' } as const;
  for (const [locale, title] of Object.entries(expectedPrivacyTitles)) {
    await page.goto(`/${localeSegments[locale as keyof typeof localeSegments]}/privacy`);
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  }
});

test('support prompt offers both QR-code and Stripe donation methods', async ({ page }) => {
  await page.goto('/zh-cn');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(0);

  const footerSupportButton = page.locator('footer').getByTestId('support-button');
  await footerSupportButton.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveCount(2);
  await expect(dialog.getByTestId('support-qr-wechat')).toBeVisible();
  await expect(dialog.getByTestId('support-qr-alipay')).toBeVisible();
  await expect(dialog.locator('button').filter({ hasText: /\$2/ })).toBeVisible();

  await expect(footerSupportButton).toHaveClass(/whitespace-nowrap/);
});

test('public course, jobs, and resume URLs recover without a blank page', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/en/courses/claude-code-guide');
  // The course body is deliberately lazy-loaded. The visible route fallback
  // is valid while Vite transforms the large course-content module locally.
  await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('h1')).toHaveText('Claude Code: Practical Guide');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://studyai.now/en/courses/claude-code-guide');

  await page.goto('/en/courses/hermes-agent-guide');
  await expect(page.locator('h1')).toHaveText('Hermes Agent: Practical Foundations');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /resident-agent mental model/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(0);

  await page.goto('/zh-cn/jobs');
  await expect(page.locator('main')).toBeVisible();

  await page.goto('/resume');
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator('main')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
