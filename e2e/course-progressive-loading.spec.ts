import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.cookie = 'studyai_now_support_prompt_seen=1; Path=/; SameSite=Lax';
  });
});

test('loads a Course/15 landing page on demand without a page error', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/zh-cn/courses/agent-engineering');
  await expect(page.getByTestId('course-loading')).toHaveCount(0);
  await expect(page.locator('h1')).toContainText('Agent 工程实战');
  await expect(page.getByRole('heading', { name: '章节目录' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('redirects an incomplete localized Course/15 route to its Chinese source', async ({ page }) => {
  await page.goto('/en/courses/agent-engineering');
  await expect(page).toHaveURL(/\/zh-cn\/courses\/agent-engineering$/);
  await expect(page.locator('h1')).toContainText('Agent 工程实战');
});

test('keeps complete localized core-course routes in their requested language', async ({ page }) => {
  await page.goto('/en/courses/claude-code-guide');
  await expect(page).toHaveURL(/\/en\/courses\/claude-code-guide$/);
  await expect(page.locator('h1')).toContainText('Claude Code: Practical Guide');
});
