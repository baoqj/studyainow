import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  catalogueEmailTemplate,
  creatorReviewEmailTemplate,
  credentialChangedEmailTemplate,
  emailServiceTestTemplate,
  learningReminderEmailTemplate,
  newCourseEmailTemplate,
  onboardingEmailTemplate,
  passwordResetEmailTemplate,
  reengagementEmailTemplate,
  resumeReadyEmailTemplate,
  securityLoginEmailTemplate,
  subscriptionCanceledEmailTemplate,
  subscriptionInviteEmailTemplate,
  subscriptionRenewedEmailTemplate,
  subscriptionWelcomeEmailTemplate,
  verificationEmailTemplate,
  type CatalogueEmailTemplate,
  type EmailLocale,
} from '../functions/_lib/email';

const root = new URL('..', import.meta.url);
const migration = readFileSync(new URL('../migrations/0028_email_delivery_system.sql', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
const campaigns = readFileSync(new URL('../functions/_lib/emailCampaigns.ts', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const emailTransport = readFileSync(new URL('../functions/_lib/email.ts', import.meta.url), 'utf8');
const resendWebhook = readFileSync(new URL('../functions/api/webhooks/resend.ts', import.meta.url), 'utf8');

for (const table of ['email_deliveries', 'account_login_devices']) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`), `missing ${table}`);
}
assert.match(migration, /marketing_email_enabled/, 'missing marketing preference');
assert.match(worker, /\/api\/admin\/email\/test/, 'missing protected template test route');
assert.match(worker, /resendWebhookPath\(env\)/, 'missing configured Resend webhook route');
assert.match(worker, /runEmailLifecycleCampaigns/, 'scheduled lifecycle email campaigns are not wired');
assert.match(campaigns, /onboarding_day_/, 'onboarding campaigns are not durable');
assert.match(wrangler, /15 13 \* \* \*/, 'daily lifecycle email cron is missing');
assert.match(wrangler, /EMAIL_RESEND_ENDPOINT_URL = "\/api\/webhooks\/resend"/, 'missing production Resend webhook path');
assert.match(emailTransport, /EMAIL_RESEND_API_KEY/, 'email transport must read EMAIL_RESEND_API_KEY');
assert.match(emailTransport, /https:\/\/api\.resend\.com\/emails/, 'email transport must use the Resend sending API');
assert.match(resendWebhook, /svix-signature/, 'Resend webhook must verify Svix signatures');

const locales: EmailLocale[] = ['zh-CN', 'zh-TW', 'en', 'fr', 'es'];
const catalogue: CatalogueEmailTemplate[] = ['new-message', 'collaboration-invite', 'task-status', 'interaction-feedback', 'milestone-report', 'release-notes', 'promotion', 'survey', 'newsletter', 'account-deletion'];

for (const locale of locales) {
  const base = { username: 'Pollux', locale };
  const templates = [
    verificationEmailTemplate({ ...base, verificationUrl: 'https://studyai.now/api/auth/verify?token=token' }),
    passwordResetEmailTemplate({ ...base, resetUrl: 'https://studyai.now/reset-password?token=token' }),
    newCourseEmailTemplate({ ...base, courseTitle: 'AI Engineering', courseDescription: 'A practical course.', courseUrl: 'https://studyai.now/courses/ai', lessonCount: 10 }),
    subscriptionInviteEmailTemplate({ ...base, planName: 'Pro', inviteUrl: 'https://studyai.now/pricing' }),
    subscriptionWelcomeEmailTemplate({ ...base, planName: 'Pro', dashboardUrl: 'https://studyai.now/me' }),
    subscriptionRenewedEmailTemplate({ ...base, planName: 'Pro', billingUrl: 'https://studyai.now/me/settings' }),
    subscriptionCanceledEmailTemplate({ ...base, planName: 'Pro', billingUrl: 'https://studyai.now/me/settings' }),
    learningReminderEmailTemplate({ ...base, courseTitle: 'AI Engineering', continueUrl: 'https://studyai.now/courses/ai' }),
    creatorReviewEmailTemplate({ ...base, courseTitle: 'AI Engineering', recommended: true, creatorUrl: 'https://studyai.now/me/creator' }),
    securityLoginEmailTemplate({ ...base, deviceLabel: 'Chrome on macOS', locationLabel: 'Toronto, CA', occurredAt: '2026-08-12T13:15:00Z', securityUrl: 'https://studyai.now/me/settings' }),
    credentialChangedEmailTemplate({ ...base, change: 'password', securityUrl: 'https://studyai.now/me/settings' }),
    onboardingEmailTemplate({ ...base, day: 1, dashboardUrl: 'https://studyai.now/me' }),
    onboardingEmailTemplate({ ...base, day: 3, dashboardUrl: 'https://studyai.now/me' }),
    onboardingEmailTemplate({ ...base, day: 7, dashboardUrl: 'https://studyai.now/me' }),
    reengagementEmailTemplate({ ...base, dashboardUrl: 'https://studyai.now/me' }),
    resumeReadyEmailTemplate({ ...base, targetRole: 'AI Engineer', resumeUrl: 'https://studyai.now/me/resume' }),
    emailServiceTestTemplate('https://studyai.now', locale),
    ...catalogue.map((key) => catalogueEmailTemplate(key, locale, 'https://studyai.now/me/notification')),
  ];
  for (const template of templates) {
    assert.ok(template.subject.length > 5, `${locale} template subject is too short`);
    assert.ok(template.text.length > 80, `${locale} template needs a full text alternative`);
    assert.match(template.html, new RegExp(`<html lang="${locale}"`), `${locale} HTML language is missing`);
    assert.match(template.html, /studyainow@mail\.com/, `${locale} template must expose the support contact email`);
  }
}

const english = verificationEmailTemplate({ username: 'Pollux', locale: 'en', verificationUrl: 'https://studyai.now/api/auth/verify?token=token' });
const french = passwordResetEmailTemplate({ username: 'Pollux', locale: 'fr', resetUrl: 'https://studyai.now/reset-password?token=token' });
const spanish = securityLoginEmailTemplate({ username: 'Pollux', locale: 'es', deviceLabel: 'Chrome', locationLabel: 'Toronto, CA', occurredAt: 'now', securityUrl: 'https://studyai.now/me/settings' });
const traditional = verificationEmailTemplate({ username: 'Pollux', locale: 'zh-TW', verificationUrl: 'https://studyai.now/api/auth/verify?token=token' });
for (const template of [english, french, spanish]) assert.doesNotMatch(template.text, /[\u4e00-\u9fff]/, 'non-Chinese template fell back to Chinese');
assert.match(traditional.text, /電郵/, 'Traditional Chinese template needs regional wording');

void root;
console.log('Email-service verification passed.');
