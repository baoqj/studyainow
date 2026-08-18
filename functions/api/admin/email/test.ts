import { requireAdmin } from '../../../_lib/auth';
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
  sendEmail,
  subscriptionCanceledEmailTemplate,
  subscriptionInviteEmailTemplate,
  subscriptionRenewedEmailTemplate,
  subscriptionWelcomeEmailTemplate,
  verificationEmailTemplate,
  type CatalogueEmailTemplate,
  type EmailLocale,
  type EmailTemplate,
} from '../../../_lib/email';
import { ApiError, errorResponse, json, readJson } from '../../../_lib/http';

type EmailTestTemplate =
  | 'service-test'
  | 'verification'
  | 'password-reset'
  | 'new-course'
  | 'subscription-invite'
  | 'subscription-welcome'
  | 'subscription-renewed'
  | 'subscription-canceled'
  | 'learning-reminder'
  | 'creator-review'
  | 'security-login'
  | 'credentials-changed'
  | 'onboarding-day-1'
  | 'onboarding-day-3'
  | 'onboarding-day-7'
  | 'reengagement'
  | 'resume-ready'
  | CatalogueEmailTemplate;

interface TestEmailBody {
  to?: unknown;
  template?: unknown;
  locale?: unknown;
}

const catalogueTemplates: CatalogueEmailTemplate[] = [
  'new-message',
  'collaboration-invite',
  'task-status',
  'interaction-feedback',
  'milestone-report',
  'release-notes',
  'promotion',
  'survey',
  'newsletter',
  'account-deletion',
];

const allowedTemplates: EmailTestTemplate[] = [
  'service-test', 'verification', 'password-reset', 'new-course', 'subscription-invite', 'subscription-welcome',
  'subscription-renewed', 'subscription-canceled', 'learning-reminder', 'creator-review', 'security-login',
  'credentials-changed', 'onboarding-day-1', 'onboarding-day-3', 'onboarding-day-7', 'reengagement',
  'resume-ready', ...catalogueTemplates,
];

function appOrigin(env: Env) {
  return env.APP_ORIGIN || 'https://studyai.now';
}

function localeOf(value: unknown): EmailLocale {
  return value === 'zh-TW' || value === 'en' || value === 'fr' || value === 'es' ? value : 'zh-CN';
}

function templateFor(type: EmailTestTemplate, origin: string, locale: EmailLocale): EmailTemplate {
  const sampleUser = 'Pollux';
  const base = { username: sampleUser, locale };

  if (type === 'verification') return verificationEmailTemplate({ ...base, verificationUrl: `${origin}/api/auth/verify?token=test-token` });
  if (type === 'password-reset') return passwordResetEmailTemplate({ ...base, resetUrl: `${origin}/reset-password?token=test-token` });
  if (type === 'new-course') return newCourseEmailTemplate({ ...base, courseTitle: 'Claude Code Practical Guide', courseDescription: 'Build a reliable AI-engineering workflow from installation to agentic practice.', courseUrl: `${origin}/courses/claude-code-guide`, lessonCount: 50 });
  if (type === 'subscription-invite') return subscriptionInviteEmailTemplate({ ...base, planName: 'Pro Monthly', inviteUrl: `${origin}/pricing` });
  if (type === 'subscription-welcome') return subscriptionWelcomeEmailTemplate({ ...base, planName: 'Pro Monthly', dashboardUrl: `${origin}/me` });
  if (type === 'subscription-renewed') return subscriptionRenewedEmailTemplate({ ...base, planName: 'Pro Monthly', currentPeriodEnd: '2026-09-01', billingUrl: `${origin}/me/settings` });
  if (type === 'subscription-canceled') return subscriptionCanceledEmailTemplate({ ...base, planName: 'Pro Monthly', accessEndsAt: '2026-09-01', billingUrl: `${origin}/me/settings` });
  if (type === 'learning-reminder') return learningReminderEmailTemplate({ ...base, courseTitle: 'Claude Code Practical Guide', continueUrl: `${origin}/courses/claude-code-guide` });
  if (type === 'creator-review') return creatorReviewEmailTemplate({ ...base, courseTitle: 'AI Agent Foundations', recommended: true, creatorUrl: `${origin}/me/creator` });
  if (type === 'security-login') return securityLoginEmailTemplate({ ...base, deviceLabel: 'Chrome on macOS', locationLabel: 'Toronto, CA', occurredAt: '2026-08-12T13:15:00Z', securityUrl: `${origin}/me/settings` });
  if (type === 'credentials-changed') return credentialChangedEmailTemplate({ ...base, change: 'password', securityUrl: `${origin}/me/settings` });
  if (type === 'onboarding-day-1' || type === 'onboarding-day-3' || type === 'onboarding-day-7') return onboardingEmailTemplate({ ...base, day: Number(type.slice(-1)) as 1 | 3 | 7, dashboardUrl: `${origin}/me` });
  if (type === 'reengagement') return reengagementEmailTemplate({ ...base, dashboardUrl: `${origin}/me` });
  if (type === 'resume-ready') return resumeReadyEmailTemplate({ ...base, targetRole: 'AI Engineer', resumeUrl: `${origin}/me/resume` });
  if (catalogueTemplates.includes(type as CatalogueEmailTemplate)) return catalogueEmailTemplate(type as CatalogueEmailTemplate, locale, `${origin}/me/notification`);
  return emailServiceTestTemplate(origin, locale);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const admin = await requireAdmin(env.DB, request);
    const body = await readJson<TestEmailBody>(request);
    const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : admin.email;
    const templateType = typeof body.template === 'string' && body.template.trim() ? body.template.trim() as EmailTestTemplate : 'service-test';
    const locale = localeOf(body.locale);
    if (!allowedTemplates.includes(templateType)) throw new ApiError(400, 'Unsupported email test template');

    const template = templateFor(templateType, appOrigin(env), locale);
    const result = await sendEmail(env, { to, ...template, tags: [{ name: 'event', value: 'admin-template-test' }] });
    return json({ ok: true, to, template: templateType, locale, email_result: result });
  } catch (error) {
    return errorResponse(error);
  }
};
