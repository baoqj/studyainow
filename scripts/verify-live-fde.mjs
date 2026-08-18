import { strict as assert } from 'node:assert';
import { chromium } from '@playwright/test';

const baseUrl = process.env.FDE_BASE_URL ?? 'https://studyai.now';
const release = process.env.FDE_RELEASE ?? String(Date.now());
const localizedMetadata = {
  'zh-CN': { title: 'FDE 前线交付工程师：从模糊需求到生产系统', topic: 'FDE工程师' },
  'zh-TW': { title: 'FDE 前線部署工程師實戰：從現場問題到可營運系統', topic: 'FDE 工程師' },
  en: { title: 'Forward Deployed Engineer (FDE): From Customer Ambiguity to Production AI', topic: 'Forward Deployed Engineer (FDE)' },
  fr: { title: 'FDE — Ingénierie IA sur le terrain : du besoin flou à la production', topic: 'Forward Deployed Engineer (FDE)' },
  es: { title: 'FDE — Ingeniería de IA en campo: del problema ambiguo a producción', topic: 'Forward Deployed Engineer (FDE)' },
};

function url(path, marker) {
  const separator = path.includes('?') ? '&' : '?';
  return `${baseUrl}${path}${separator}release=${encodeURIComponent(release)}-${marker}`;
}

async function localizedPage(browser, locale) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'studyai_now_support_prompt_seen', value: '1', url: baseUrl }]);
  await context.addInitScript((selectedLocale) => {
    window.localStorage.setItem('studyai.now.locale', selectedLocale);
  }, locale);
  return { context, page: await context.newPage() };
}

const browser = await chromium.launch({ headless: true });
try {
  const localeResults = [];
  for (const [locale, expected] of Object.entries(localizedMetadata)) {
    const { context, page } = await localizedPage(browser, locale);
    await page.goto(url('/courses/forward-deployed-engineering', locale), { waitUntil: 'domcontentloaded' });
    const heading = page.locator('main h1').first();
    await heading.waitFor({ state: 'visible' });
    assert.equal((await heading.textContent())?.trim(), expected.title, `${locale}: wrong localized title`);
    await page.locator('main nav').getByText(expected.topic, { exact: true }).waitFor({ state: 'visible' });
    const cover = page.locator(`img[alt=${JSON.stringify(expected.title)}]`).first();
    await cover.waitFor({ state: 'visible' });
    const coverHandle = await cover.elementHandle();
    await page.waitForFunction((image) => image?.complete && image.naturalWidth > 0, coverHandle, { timeout: 15_000 });
    const coverSize = await cover.evaluate((image) => ({ width: image.naturalWidth, height: image.naturalHeight }));
    assert.ok(coverSize.width > 900 && coverSize.height > 500, `${locale}: cover did not load at production resolution`);
    assert.match(await page.locator('main').innerText(), /61|六十一|soixante et une|sesenta y una/i, `${locale}: lesson count missing`);
    const skillTags = page.locator('#course-skill-tags');
    await page.waitForFunction(() => document.querySelector('#course-skill-tags')?.getAttribute('data-collapsed') === 'true');
    const collapsedSize = await skillTags.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
    assert.ok(collapsedSize.clientHeight <= 28 && collapsedSize.scrollHeight > collapsedSize.clientHeight, `${locale}: skills are not collapsed to one row`);
    const skillToggle = page.locator('button[aria-controls="course-skill-tags"]');
    assert.equal(await skillToggle.getAttribute('aria-expanded'), 'false');
    await skillToggle.click();
    assert.equal(await skillToggle.getAttribute('aria-expanded'), 'true');
    const expandedSize = await skillTags.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
    assert.ok(expandedSize.clientHeight === expandedSize.scrollHeight, `${locale}: skills did not fully expand`);
    localeResults.push({ locale, title: expected.title, topic: expected.topic, coverSize, collapsedSize, expandedHeight: expandedSize.clientHeight });
    await context.close();
  }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobileContext.addCookies([{ name: 'studyai_now_support_prompt_seen', value: '1', url: baseUrl }]);
  await mobileContext.addInitScript(() => window.localStorage.setItem('studyai.now.locale', 'zh-CN'));
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(url('/courses/forward-deployed-engineering', 'mobile'), { waitUntil: 'domcontentloaded' });
  await mobilePage.getByRole('heading', { name: localizedMetadata['zh-CN'].title, exact: true }).waitFor({ state: 'visible' });
  const mobileSkills = mobilePage.locator('#course-skill-tags');
  await mobilePage.waitForFunction(() => document.querySelector('#course-skill-tags')?.getAttribute('data-collapsed') === 'true');
  const mobileCollapsedHeight = await mobileSkills.evaluate((element) => element.clientHeight);
  assert.ok(mobileCollapsedHeight <= 28, `mobile: collapsed skills use ${mobileCollapsedHeight}px instead of one row`);
  const mobileToggle = mobilePage.locator('button[aria-controls="course-skill-tags"]');
  await mobileToggle.click();
  assert.equal(await mobileToggle.getAttribute('aria-expanded'), 'true');
  const mobileExpandedHeight = await mobileSkills.evaluate((element) => element.clientHeight);
  assert.ok(mobileExpandedHeight > mobileCollapsedHeight * 3, 'mobile: expanding skills did not reveal the full list');
  await mobileContext.close();

  const { context, page } = await localizedPage(browser, 'en');

  await page.goto(url('/courses/forward-deployed-engineering/chapters/1/lessons/01-01', 'choice'), { waitUntil: 'domcontentloaded' });
  const correctChoice = page.getByRole('button', { name: /Lock the baseline, permissions, and gate/i });
  await correctChoice.waitFor({ state: 'visible' });
  await correctChoice.click();
  await page.getByRole('status').filter({ hasText: /Sound judgment/i }).waitFor({ state: 'visible' });

  await page.goto(url('/courses/forward-deployed-engineering/chapters/1/lessons/01-02', 'drag'), { waitUntil: 'domcontentloaded' });
  const assignments = [
    ['Generate a candidate answer', 'Model candidate'],
    ['Enforce ACL checks', 'Deterministic control'],
    ['Approve a high-impact action', 'Human authority'],
    ['Retry APIs idempotently', 'Deterministic control'],
    ['Trigger an emergency stop', 'Deterministic control'],
    ['Record the audit trace', 'Deterministic control'],
  ];
  for (const [card, bucket] of assignments) {
    const source = page.getByRole('button', { name: card, exact: true });
    const target = page.getByRole('heading', { name: bucket, exact: true }).locator('..');
    await source.dragTo(target);
  }
  await page.getByRole('button', { name: 'Check boundaries', exact: true }).click();
  await page.getByRole('status').filter({ hasText: /All correct/i }).waitFor({ state: 'visible' });

  await page.goto(url('/courses/forward-deployed-engineering/chapters/1/lessons/01-03', 'slider'), { waitUntil: 'domcontentloaded' });
  const slider = page.locator('#fde-autonomy');
  await slider.waitFor({ state: 'visible' });
  await slider.focus();
  await slider.press('End');
  await page.getByText('100%', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('status').filter({ hasText: /risk is rising faster than value/i }).waitFor({ state: 'visible' });

  const jobSlug = 'cohere-forward-deployed-engineer-agentic-platform';
  await page.goto(url(`/jobs/${jobSlug}`, 'job-map'), { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Forward Deployed Engineer, Agentic Platform', exact: true }).waitFor({ state: 'visible' });
  const workflowSkill = page.locator('section[id^="skill-"]').filter({ hasText: 'Workflow discovery' }).first();
  await workflowSkill.locator('button').first().click();
  const lessonLink = workflowSkill.locator('a[href*="/courses/forward-deployed-engineering/chapters/2/lessons/02-01"]');
  await lessonLink.waitFor({ state: 'visible' });
  const mappedHref = await lessonLink.getAttribute('href');
  assert.match(mappedHref ?? '', /job=cohere-forward-deployed-engineer-agentic-platform/);
  assert.match(mappedHref ?? '', /skill=workflow-discovery/);
  await lessonLink.click();
  await page.waitForURL(/\/courses\/forward-deployed-engineering\/chapters\/2\/lessons\/02-01/);
  await page.getByRole('heading', { name: 'Design the Discovery Room', exact: true }).waitFor({ state: 'visible' });

  const response = await page.request.get(url(`/api/jobs/${jobSlug}`, 'api-map'));
  assert.equal(response.status(), 200);
  const payload = await response.json();
  const mappedSkills = payload.skills.filter((skill) => skill.courses.some((course) => course.courseId === 'forward-deployed-engineering'));
  assert.ok(mappedSkills.length >= 15, `expected at least 15 mapped JD skills, found ${mappedSkills.length}`);
  assert.ok(mappedSkills.some((skill) => skill.slug === 'python-production-engineering' && skill.courses.some((course) => course.lessonRouteId === '04-05')));
  assert.ok(mappedSkills.some((skill) => skill.slug === 'model-evaluation' && skill.courses.some((course) => course.lessonRouteId === '10-03')));

  console.log(JSON.stringify({
    baseUrl,
    release,
    locales: localeResults,
    responsiveSkills: { mobileCollapsedHeight, mobileExpandedHeight },
    interactions: ['click-choice', 'drag-sort', 'autonomy-slider'],
    job: payload.job.title,
    mappedSkillCount: mappedSkills.length,
    jdCourseLink: mappedHref,
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
