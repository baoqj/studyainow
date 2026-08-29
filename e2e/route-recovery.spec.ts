import { expect, test, type Page } from '@playwright/test';

const accountOverview = {
  profile: { id: 'test-user', email: 'learner@example.com', display_name: 'Test learner', username: 'learner', avatar_url: null, email_verified_at: '2026-08-12T12:00:00.000Z' },
  points: 0,
  badges: [],
  courses: [{
    course_id: 'course-1', course_slug: 'claude-code-guide', course_title: 'Claude Code 实战指南', completed_chapters: 0, chapter_count: 15, average_progress: 4, last_read_at: '2026-08-12T12:00:00.000Z',
    lesson_progress: [{ course_id: 'course-1', chapter_number: 1, chapter_slug: '1', lesson_route_id: '01-01', lesson_number: 1, status: 'reading', progress_percent: 4, scroll_y: 32, last_read_at: '2026-08-12T12:00:00.000Z', completed_at: null }],
  }],
  history: [], notifications: [], creator: { total: 0, recommended: 0 }, resumes: { total: 0 },
};

async function mockApplicationApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { user: { id: 'test-user', display_name: 'Test learner', username: 'learner', avatar_url: null } } });
    if (url.pathname === '/api/account/overview') return route.fulfill({ json: accountOverview });
    if (url.pathname === '/api/creator/courses') return route.fulfill({ json: { courses: [] } });
    if (url.pathname === '/api/jobs') return route.fulfill({ json: { jobs: [], total: 0, facets: { countries: [], cities: [] } } });
    return route.fulfill({ status: 200, json: {} });
  });
}

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name: 'studyai_now_support_prompt_seen', value: '1', domain: '127.0.0.1', path: '/' }]);
  await mockApplicationApi(page);
});

test('course creation to My courses stays rendered without a page error', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/me/creator');
  await expect(page.locator('a[href="/me/creator/new"]').first()).toBeVisible();
  await page.locator('a[href="/me/course"]').first().click();
  await expect(page).toHaveURL(/\/me\/course$/);
  await expect(page.getByTestId('my-courses-view-mode')).toBeVisible();
  await expect(page.getByTestId('my-courses-loading')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('workspace logo returns to the catalogue without a page error', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/me/creator');
  await expect(page.locator('a[href="/me/creator/new"]').first()).toBeVisible();
  await page.getByRole('link', { name: 'Study AI Now!' }).click();
  await expect(page).toHaveURL(/\/(?:zh-cn|zh-tw|en|fr|es)$/);
  await expect(page.getByTestId('catalog-page')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
