import { expect, test } from '@playwright/test';

const setId = 'inference-engine-scheduler';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.cookie = 'studyai_now_support_prompt_seen=1; Path=/; SameSite=Lax';
  });
});

test('catalog exposes the inference-engine set and opens its five-stage outline', async ({ page }) => {
  await page.goto('/interviews');
  const card = page.locator(`[data-interview-set-id="${setId}"]`);
  await expect(card).toHaveCount(1);
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/interviews/${setId}$`));
  const tocQuestionLinks = page.locator(`ol a[href^="/interviews/${setId}/levels/"][href*="/questions/"]`);
  await expect(tocQuestionLinks).toHaveCount(5);
  await expect(tocQuestionLinks.first()).toHaveAttribute('href', `/interviews/${setId}/levels/1/questions/1-1`);
});

test('catalog aligns its desktop filters to the left of the interview results', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/interviews');

  const sidebar = page.getByTestId('interview-filters-sidebar');
  const results = page.getByTestId('interview-results');
  await expect(sidebar).toBeVisible();
  await expect(results).toBeVisible();

  const sidebarBox = await sidebar.boundingBox();
  const resultsBox = await results.boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(resultsBox).not.toBeNull();
  expect(sidebarBox!.width).toBeGreaterThanOrEqual(250);
  expect(sidebarBox!.x + sidebarBox!.width).toBeLessThan(resultsBox!.x);
  expect(Math.abs(sidebarBox!.y - resultsBox!.y)).toBeLessThanOrEqual(1);

  await page.getByTestId('interview-category-filters').locator('input').first().check();
  await expect(page.locator('[data-interview-set-id]')).toHaveCount(1);
});

test('catalog exposes the same filters in a mobile drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/interviews');

  await expect(page.getByTestId('interview-filters-sidebar')).toBeHidden();
  await page.locator('header button[aria-haspopup="dialog"]').click();
  await expect(page.getByTestId('interview-filters-drawer')).toBeVisible();
  await expect(page.getByTestId('interview-filters-drawer-content')).toBeVisible();
});

test('question page renders the progressive trace and advances deterministically', async ({ page }) => {
  await page.goto(`/interviews/${setId}/levels/4/questions/4-1`);
  const trace = page.getByTestId('inference-engine-trace');
  await expect(trace).toBeVisible();
  await expect(trace).toHaveAttribute('data-trace-step', '0');
  await page.getByTestId('inference-trace-next').click();
  await expect(trace).toHaveAttribute('data-trace-step', '1');
  await page.getByTestId('inference-trace-reset').click();
  await expect(trace).toHaveAttribute('data-trace-step', '0');
});

test('set cover swaps to the dark companion without duplicating accessible text', async ({ page }) => {
  await page.goto(`/interviews/${setId}`);
  const lightCover = page.locator('img[src*="inference-engine-scheduler-cover-light"]');
  const darkCover = page.locator('img[src*="inference-engine-scheduler-cover-dark"]');
  await expect(lightCover).toBeVisible();
  await expect(darkCover).toBeHidden();
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(lightCover).toBeHidden();
  await expect(darkCover).toBeVisible();
  await expect(darkCover).toHaveAttribute('alt', '');
});

test('invalid inference-engine level is a noindex not-found route', async ({ page }) => {
  await page.goto(`/interviews/${setId}/levels/6`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page).toHaveTitle(/Page not found/i);
});

test('French typography still parses the suggested time and question focus', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('studyai.now.locale', 'fr'));
  await page.goto(`/interviews/${setId}/levels/1`);
  await expect(page.getByText(/35 à 45 minutes/).first()).toBeVisible();
  await page.goto(`/interviews/${setId}/levels/1/questions/1-1`);
  await expect(page.getByText(/planification déterministe, files ordonnées/i).first()).toBeVisible();
});
