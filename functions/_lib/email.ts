import { ApiError } from './http';
import { sha256Base64Url } from './crypto';

const RESEND_API_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_APP_ORIGIN = 'https://studyai.now';
const DEFAULT_FROM_EMAIL = 'Study AI Now! <info@studyai.now>';
const SUPPORT_EMAIL = 'studyainow@mail.com';
const DEFAULT_RESEND_WEBHOOK_PATH = '/api/webhooks/resend';

type EmailTone = 'primary' | 'course' | 'billing' | 'warning';

export type EmailLocale = 'zh-CN' | 'zh-TW' | 'en' | 'fr' | 'es';
export type EmailCategory = 'transactional' | 'engagement' | 'marketing';

interface TemplateAction {
  label: string;
  url: string;
}

interface TemplateSection {
  title: string;
  body: string;
}

interface TemplateInput {
  locale?: EmailLocale;
  eyebrow: string;
  title: string;
  intro: string;
  action?: TemplateAction;
  sections?: TemplateSection[];
  note?: string;
  tone?: EmailTone;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

interface BaseTemplateParams {
  username?: string;
  locale?: EmailLocale;
}

export interface VerificationEmailParams extends BaseTemplateParams {
  verificationUrl: string;
}

export interface PasswordResetEmailParams extends BaseTemplateParams {
  resetUrl: string;
}

export interface NewCourseEmailParams extends BaseTemplateParams {
  courseTitle: string;
  courseDescription: string;
  courseUrl: string;
  lessonCount?: number;
}

export interface SubscriptionInviteEmailParams extends BaseTemplateParams {
  planName: string;
  inviteUrl: string;
}

export interface SubscriptionWelcomeEmailParams extends BaseTemplateParams {
  planName: string;
  dashboardUrl: string;
}

export interface SubscriptionRenewedEmailParams extends BaseTemplateParams {
  planName: string;
  currentPeriodEnd?: string;
  billingUrl: string;
}

export interface SubscriptionCanceledEmailParams extends BaseTemplateParams {
  planName: string;
  accessEndsAt?: string;
  billingUrl: string;
}

export interface LearningReminderEmailParams extends BaseTemplateParams {
  courseTitle: string;
  continueUrl: string;
}

export interface CreatorReviewEmailParams extends BaseTemplateParams {
  courseTitle: string;
  recommended: boolean;
  reviewNote?: string;
  creatorUrl: string;
}

export interface SecurityLoginEmailParams extends BaseTemplateParams {
  deviceLabel: string;
  locationLabel: string;
  occurredAt: string;
  securityUrl: string;
}

export interface CredentialChangedEmailParams extends BaseTemplateParams {
  change: 'password' | 'email' | 'phone' | 'account_deletion';
  securityUrl: string;
}

export interface OnboardingEmailParams extends BaseTemplateParams {
  day: 1 | 3 | 7;
  dashboardUrl: string;
}

export interface ReengagementEmailParams extends BaseTemplateParams {
  dashboardUrl: string;
}

export interface ResumeReadyEmailParams extends BaseTemplateParams {
  targetRole: string;
  resumeUrl: string;
}

export interface GenericEventEmailParams extends BaseTemplateParams {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  actionLabel?: string;
  actionUrl?: string;
  details?: string;
  tone?: EmailTone;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function appOrigin(env: Env, _request: Request) {
  return env.APP_ORIGIN || DEFAULT_APP_ORIGIN;
}

function emailFrom(env: Env) {
  return env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
}

const EMAIL_CHROME: Record<EmailLocale, {
  appSubtitle: string;
  fallback: string;
  support: string;
  greeting: (username?: string) => string;
}> = {
  'zh-CN': {
    appSubtitle: 'AI 课程 · 实战训练平台',
    fallback: '如果按钮不可用，请复制链接到浏览器打开：',
    support: '这封邮件由 Study AI Now! 发送。如需帮助，请联系',
    greeting: (username) => username ? `${username}，你好。` : '你好。',
  },
  'zh-TW': {
    appSubtitle: 'AI 課程 · 實戰訓練平台',
    fallback: '如果按鈕無法使用，請複製連結到瀏覽器開啟：',
    support: '此電郵由 Study AI Now! 發送。如需協助，請聯絡',
    greeting: (username) => username ? `${username}，你好。` : '你好。',
  },
  en: {
    appSubtitle: 'AI courses · Practical learning platform',
    fallback: 'If the button does not work, copy this link into your browser:',
    support: 'This email was sent by Study AI Now!. Need help? Contact',
    greeting: (username) => username ? `Hi ${username},` : 'Hello,',
  },
  fr: {
    appSubtitle: 'Cours d’IA · Plateforme d’apprentissage pratique',
    fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
    support: 'Cet e-mail a été envoyé par Study AI Now!. Besoin d’aide ? Contactez',
    greeting: (username) => username ? `Bonjour ${username},` : 'Bonjour,',
  },
  es: {
    appSubtitle: 'Cursos de IA · Plataforma de aprendizaje práctico',
    fallback: 'Si el botón no funciona, copia este enlace en tu navegador:',
    support: 'Este correo fue enviado por Study AI Now!. Si necesitas ayuda, contacta con',
    greeting: (username) => username ? `Hola ${username},` : 'Hola,',
  },
};

export function normalizeEmailLocale(value: unknown): EmailLocale {
  return value === 'zh-TW' || value === 'en' || value === 'fr' || value === 'es' ? value : 'zh-CN';
}

function greeting(locale: EmailLocale, username?: string) {
  return EMAIL_CHROME[locale].greeting(username);
}

function toneColor(tone: EmailTone = 'primary') {
  if (tone === 'course') return '#006591';
  if (tone === 'billing') return '#0f766e';
  if (tone === 'warning') return '#a44100';
  return '#3525cd';
}

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textTemplate(subject: string, input: TemplateInput) {
  const locale = normalizeEmailLocale(input.locale);
  const lines = [subject, '', input.title, input.intro];

  if (input.sections?.length) {
    input.sections.forEach((section) => {
      lines.push('', section.title, section.body);
    });
  }

  if (input.action) {
    lines.push('', `${input.action.label}: ${input.action.url}`);
  }

  if (input.note) {
    lines.push('', input.note);
  }

  lines.push('', `${EMAIL_CHROME[locale].support} ${SUPPORT_EMAIL}`);
  return lines.join('\n');
}

function renderTemplate(subject: string, input: TemplateInput): EmailTemplate {
  const locale = normalizeEmailLocale(input.locale);
  const chrome = EMAIL_CHROME[locale];
  const color = toneColor(input.tone);
  const safeEyebrow = escapeHtml(input.eyebrow);
  const safeTitle = escapeHtml(input.title);
  const safeIntro = escapeHtml(input.intro);
  const safeNote = input.note ? escapeHtml(input.note) : '';
  const safeActionUrl = input.action ? escapeHtml(input.action.url) : '';
  const safeActionLabel = input.action ? escapeHtml(input.action.label) : '';
  const sectionHtml = (input.sections ?? [])
    .map(
      (section) => `
        <tr>
          <td style="padding:18px 20px;border:1px solid #d8ddf0;border-radius:14px;background:#ffffff;">
            <p style="margin:0 0 8px;color:#141b2b;font-size:15px;font-weight:700;">${escapeHtml(section.title)}</p>
            <p style="margin:0;color:#464555;font-size:14px;line-height:1.7;">${escapeHtml(section.body)}</p>
          </td>
        </tr>
        <tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>`,
    )
    .join('');

  const actionHtml = input.action
    ? `
        <tr>
          <td style="padding:8px 0 24px;">
            <a href="${safeActionUrl}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:12px;">
              ${safeActionLabel}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 24px;">
            <p style="margin:0;color:#777587;font-size:12px;line-height:1.7;">${escapeHtml(chrome.fallback)}</p>
            <p style="margin:8px 0 0;padding:12px;border-radius:10px;background:#f1f3ff;color:#141b2b;font-size:12px;line-height:1.6;word-break:break-all;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;">
              ${safeActionUrl}
            </p>
          </td>
        </tr>`
    : '';

  const noteHtml = safeNote
    ? `
        <tr>
          <td style="padding:16px 18px;border-left:4px solid ${color};border-radius:12px;background:#f9f9ff;color:#464555;font-size:13px;line-height:1.7;">
            ${safeNote}
          </td>
        </tr>`
    : '';

  const html = `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f9f9ff;color:#141b2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${safeIntro}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9f9ff;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #d8ddf0;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(20,27,43,0.08);">
            <tr>
              <td style="padding:24px 28px;background:#eef6ff;color:#141b2b;border-bottom:1px solid #d8ddf0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-size:20px;font-weight:800;letter-spacing:0;color:#141b2b;">Study AI Now!</div>
                      <div style="margin-top:6px;color:#464555;font-size:12px;">${escapeHtml(chrome.appSubtitle)}</div>
                    </td>
                    <td align="right">
                      <span style="display:inline-block;border:1px solid #c7d4ee;background:#ffffff;border-radius:999px;padding:7px 11px;color:${color};font-size:12px;font-weight:700;">${safeEyebrow}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 10px;">
                <div style="height:4px;width:54px;border-radius:99px;background:${color};margin-bottom:22px;"></div>
                <h1 style="margin:0;color:#141b2b;font-size:28px;line-height:1.25;letter-spacing:-0.02em;">${safeTitle}</h1>
                <p style="margin:16px 0 22px;color:#464555;font-size:16px;line-height:1.8;">${safeIntro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${sectionHtml}
                  ${actionHtml}
                  ${noteHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 28px;color:#777587;font-size:12px;line-height:1.7;">
                ${escapeHtml(chrome.support)}
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#3525cd;text-decoration:none;">${SUPPORT_EMAIL}</a>。
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    html,
    text: textTemplate(subject, input) || stripTags(html),
  };
}

export function resendApiKey(env: Env) {
  // EMAIL_RESEND_API_KEY is the production secret. Keep the original name as
  // a non-breaking fallback for a local or older Worker deployment.
  return env.EMAIL_RESEND_API_KEY || env.RESEND_API_KEY;
}

export function hasResendConfig(env: Env) {
  return Boolean(resendApiKey(env));
}

export function resendWebhookPath(env: Env) {
  const configured = env.EMAIL_RESEND_ENDPOINT_URL?.trim();
  if (!configured || !configured.startsWith('/api/') || configured.includes('://') || configured.includes('?') || configured.includes('#')) {
    return DEFAULT_RESEND_WEBHOOK_PATH;
  }
  return configured;
}

export function canUseDevelopmentVerificationLink(env: Env, request: Request) {
  const hostname = new URL(request.url).hostname;
  return env.CF_PAGES_BRANCH === 'local' || hostname === 'localhost' || hostname === '127.0.0.1';
}

export function verificationUrl(env: Env, request: Request, token: string) {
  const url = new URL('/api/auth/verify', appOrigin(env, request));
  url.searchParams.set('token', token);
  return url.toString();
}

export function passwordResetUrl(env: Env, request: Request, token: string) {
  const url = new URL('/reset-password', appOrigin(env, request));
  url.searchParams.set('token', token);
  return url.toString();
}

export async function sendEmail(env: Env, options: SendEmailOptions) {
  const apiKey = resendApiKey(env);
  if (!apiKey) {
    return { sent: false, reason: 'resend_not_configured' };
  }

  const response = await fetch(RESEND_API_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': options.idempotencyKey ?? crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: emailFrom(env),
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo ?? SUPPORT_EMAIL,
      ...(options.tags?.length ? { tags: options.tags } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(502, `Resend email failed: ${text || response.statusText}`);
  }

  const data = (await response.json().catch(() => ({}))) as { id?: string };
  return { sent: true, resend_id: data.id };
}

export interface SendUserEmailOptions extends Omit<SendEmailOptions, 'to' | 'idempotencyKey'> {
  userId: string;
  to: string;
  locale?: EmailLocale;
  eventType: string;
  category: EmailCategory;
  idempotencyKey?: string;
}

type DeliveryRow = {
  id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  resend_id: string | null;
  skip_reason: string | null;
};

function stableIdempotencyKey(value: string) {
  return value.slice(0, 256);
}

async function canReceiveCategory(env: Env, userId: string, category: EmailCategory) {
  if (category === 'transactional') return { allowed: true };
  const preference = await env.DB
    .prepare('SELECT notification_email_enabled, marketing_email_enabled FROM users WHERE id = ?')
    .bind(userId)
    .first<{ notification_email_enabled: number; marketing_email_enabled: number }>();
  if (!preference) return { allowed: false, reason: 'user_not_found' };
  if (category === 'engagement' && !Boolean(preference.notification_email_enabled)) {
    return { allowed: false, reason: 'engagement_opt_out' };
  }
  if (category === 'marketing' && !Boolean(preference.marketing_email_enabled)) {
    return { allowed: false, reason: 'marketing_opt_out' };
  }
  return { allowed: true };
}

/**
 * Persist and send a user-facing email exactly once for the application event.
 * D1 gives campaigns durable deduplication; Resend's Idempotency-Key protects
 * a retry that occurs after a network interruption but before the D1 update.
 */
export async function sendUserEmail(env: Env, options: SendUserEmailOptions) {
  const locale = normalizeEmailLocale(options.locale);
  const idempotencyKey = stableIdempotencyKey(
    options.idempotencyKey ?? `studyainow/${options.eventType}/${options.userId}/${crypto.randomUUID()}`,
  );
  const existing = await env.DB
    .prepare('SELECT id, status, resend_id, skip_reason FROM email_deliveries WHERE idempotency_key = ?')
    .bind(idempotencyKey)
    .first<DeliveryRow>();
  if (existing) {
    return {
      sent: existing.status === 'sent',
      duplicate: true,
      status: existing.status,
      resend_id: existing.resend_id ?? undefined,
      reason: existing.skip_reason ?? undefined,
    };
  }

  const deliveryId = crypto.randomUUID();
  await env.DB
    .prepare(
      `INSERT INTO email_deliveries
       (id, user_id, recipient_email, event_type, category, locale, subject, idempotency_key, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .bind(deliveryId, options.userId, options.to, options.eventType, options.category, locale, options.subject, idempotencyKey)
    .run();

  const permission = await canReceiveCategory(env, options.userId, options.category);
  if (!permission.allowed || !hasResendConfig(env)) {
    const reason = permission.reason ?? 'resend_not_configured';
    await env.DB
      .prepare("UPDATE email_deliveries SET status = 'skipped', skip_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(reason, deliveryId)
      .run();
    return { sent: false, status: 'skipped' as const, reason };
  }

  try {
    const result = await sendEmail(env, {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      tags: [
        { name: 'event', value: options.eventType.slice(0, 200) },
        { name: 'category', value: options.category },
        ...(options.tags ?? []),
      ].slice(0, 5),
      idempotencyKey,
    });
    await env.DB
      .prepare("UPDATE email_deliveries SET status = 'sent', resend_id = ?, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(result.resend_id ?? null, deliveryId)
      .run();
    return { ...result, status: 'sent' as const, delivery_id: deliveryId };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : 'Unknown email delivery error';
    await env.DB
      .prepare("UPDATE email_deliveries SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(message, deliveryId)
      .run();
    throw error;
  }
}

type LocalizedValue = Record<EmailLocale, string>;

function inLocale(locale: EmailLocale | undefined, value: LocalizedValue) {
  return value[normalizeEmailLocale(locale)];
}

function emailLocale(params: BaseTemplateParams) {
  return normalizeEmailLocale(params.locale);
}

export function verificationEmailTemplate(params: VerificationEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, {
    'zh-CN': '验证你的 Study AI Now! 账户',
    'zh-TW': '驗證你的 Study AI Now! 帳戶',
    en: 'Verify your Study AI Now! account',
    fr: 'Vérifiez votre compte Study AI Now!',
    es: 'Verifica tu cuenta de Study AI Now!',
  });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '邮箱验证', 'zh-TW': '電郵驗證', en: 'Email verification', fr: 'Vérification de l’e-mail', es: 'Verificación de correo' }),
    title: inLocale(locale, { 'zh-CN': '确认邮箱后开始学习', 'zh-TW': '確認電郵後開始學習', en: 'Confirm your email to start learning', fr: 'Confirmez votre e-mail pour commencer', es: 'Confirma tu correo para empezar a aprender' }),
    intro: inLocale(locale, {
      'zh-CN': `${greeting(locale, params.username)}请点击下方按钮完成邮箱验证。验证后即可登录 Study AI Now!，保存课程进度并进入 CLI Lab。`,
      'zh-TW': `${greeting(locale, params.username)}請點選下方按鈕完成電郵驗證。驗證後即可登入 Study AI Now!，儲存課程進度並使用 CLI Lab。`,
      en: `${greeting(locale, params.username)} Please use the button below to verify your email. Then you can sign in, save course progress, and use CLI Lab.`,
      fr: `${greeting(locale, params.username)} Utilisez le bouton ci-dessous pour vérifier votre e-mail. Vous pourrez ensuite vous connecter, enregistrer votre progression et utiliser CLI Lab.`,
      es: `${greeting(locale, params.username)} Usa el botón de abajo para verificar tu correo. Después podrás iniciar sesión, guardar tu progreso y usar CLI Lab.`,
    }),
    action: { label: inLocale(locale, { 'zh-CN': '验证邮箱', 'zh-TW': '驗證電郵', en: 'Verify email', fr: 'Vérifier mon e-mail', es: 'Verificar correo' }), url: params.verificationUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '有效期', 'zh-TW': '有效期限', en: 'Expiry', fr: 'Expiration', es: 'Vencimiento' }), body: inLocale(locale, { 'zh-CN': '此验证链接 24 小时内有效。过期后可以重新注册或再次发起验证。', 'zh-TW': '此驗證連結於 24 小時內有效。逾期後可重新註冊或再次發起驗證。', en: 'This verification link is valid for 24 hours. If it expires, register again or request another verification email.', fr: 'Ce lien de vérification est valable 24 heures. S’il expire, inscrivez-vous à nouveau ou demandez un autre e-mail de vérification.', es: 'Este enlace de verificación es válido durante 24 horas. Si caduca, regístrate de nuevo o solicita otro correo de verificación.' }) },
      { title: inLocale(locale, { 'zh-CN': '安全提醒', 'zh-TW': '安全提醒', en: 'Security note', fr: 'Rappel de sécurité', es: 'Aviso de seguridad' }), body: inLocale(locale, { 'zh-CN': '如果你没有注册 Study AI Now!，请忽略这封邮件，不需要进行任何操作。', 'zh-TW': '如果你沒有註冊 Study AI Now!，請忽略此電郵，無需採取任何動作。', en: 'If you did not create a Study AI Now! account, ignore this email. No action is required.', fr: 'Si vous n’avez pas créé de compte Study AI Now!, ignorez cet e-mail. Aucune action n’est requise.', es: 'Si no creaste una cuenta de Study AI Now!, ignora este correo. No necesitas hacer nada.' }) },
    ],
    tone: 'primary',
  });
}

export function passwordResetEmailTemplate(params: PasswordResetEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, { 'zh-CN': '重设你的 Study AI Now! 密码', 'zh-TW': '重設你的 Study AI Now! 密碼', en: 'Reset your Study AI Now! password', fr: 'Réinitialisez votre mot de passe Study AI Now!', es: 'Restablece tu contraseña de Study AI Now!' });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '找回密码', 'zh-TW': '找回密碼', en: 'Password reset', fr: 'Réinitialisation', es: 'Restablecer contraseña' }),
    title: inLocale(locale, { 'zh-CN': '设置一个新密码', 'zh-TW': '設定新密碼', en: 'Set a new password', fr: 'Définissez un nouveau mot de passe', es: 'Crea una contraseña nueva' }),
    intro: inLocale(locale, {
      'zh-CN': `${greeting(locale, params.username)}我们收到了你的密码重设请求。请通过下方链接设置新密码。`,
      'zh-TW': `${greeting(locale, params.username)}我們收到你的密碼重設請求。請透過下方連結設定新密碼。`,
      en: `${greeting(locale, params.username)} We received a request to reset your password. Use the link below to set a new one.`,
      fr: `${greeting(locale, params.username)} Nous avons reçu une demande de réinitialisation. Utilisez le lien ci-dessous pour définir un nouveau mot de passe.`,
      es: `${greeting(locale, params.username)} Recibimos una solicitud para restablecer tu contraseña. Usa el enlace de abajo para crear una nueva.`,
    }),
    action: { label: inLocale(locale, { 'zh-CN': '重设密码', 'zh-TW': '重設密碼', en: 'Reset password', fr: 'Réinitialiser le mot de passe', es: 'Restablecer contraseña' }), url: params.resetUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '有效期', 'zh-TW': '有效期限', en: 'Expiry', fr: 'Expiration', es: 'Vencimiento' }), body: inLocale(locale, { 'zh-CN': '这个找回密码链接 30 分钟内有效，且只能使用一次。', 'zh-TW': '此找回密碼連結於 30 分鐘內有效，且只能使用一次。', en: 'This password-reset link is valid for 30 minutes and can be used only once.', fr: 'Ce lien de réinitialisation est valable 30 minutes et ne peut être utilisé qu’une fois.', es: 'Este enlace de restablecimiento es válido durante 30 minutos y solo se puede usar una vez.' }) },
      { title: inLocale(locale, { 'zh-CN': '不是你本人操作？', 'zh-TW': '不是你本人操作？', en: 'Wasn’t you?', fr: 'Ce n’était pas vous ?', es: '¿No fuiste tú?' }), body: inLocale(locale, { 'zh-CN': '如果你没有请求找回密码，可以忽略这封邮件，你的账户不会被修改。', 'zh-TW': '如果你沒有要求找回密碼，可忽略此電郵；你的帳戶不會被更改。', en: 'If you did not request a password reset, ignore this email. Your account will not be changed.', fr: 'Si vous n’avez pas demandé de réinitialisation, ignorez cet e-mail. Votre compte ne sera pas modifié.', es: 'Si no solicitaste restablecer la contraseña, ignora este correo. Tu cuenta no se modificará.' }) },
    ],
    tone: 'warning',
  });
}

export function newCourseEmailTemplate(params: NewCourseEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, { 'zh-CN': `新课程上线：${params.courseTitle}`, 'zh-TW': `新課程上線：${params.courseTitle}`, en: `New course: ${params.courseTitle}`, fr: `Nouveau cours : ${params.courseTitle}`, es: `Nuevo curso: ${params.courseTitle}` });
  const lessons = inLocale(locale, {
    'zh-CN': params.lessonCount ? `${params.lessonCount} 节结构化内容` : '结构化章节内容',
    'zh-TW': params.lessonCount ? `${params.lessonCount} 節結構化內容` : '結構化章節內容',
    en: params.lessonCount ? `${params.lessonCount} structured lessons` : 'structured lesson content',
    fr: params.lessonCount ? `${params.lessonCount} leçons structurées` : 'du contenu de cours structuré',
    es: params.lessonCount ? `${params.lessonCount} lecciones estructuradas` : 'contenido estructurado por lecciones',
  });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '新课程上线', 'zh-TW': '新課程上線', en: 'New course', fr: 'Nouveau cours', es: 'Nuevo curso' }),
    title: params.courseTitle,
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}Study AI Now! 新课程已经上线，适合用一个完整学习路径把概念、实践和交付串起来。`, 'zh-TW': `${greeting(locale, params.username)}Study AI Now! 新課程已經上線，透過完整學習路徑連結概念、實作與交付。`, en: `${greeting(locale, params.username)} A new Study AI Now! course is available, with a complete path from concepts to practice and delivery.`, fr: `${greeting(locale, params.username)} Un nouveau cours Study AI Now! est disponible, avec un parcours complet des concepts à la pratique et à la réalisation.`, es: `${greeting(locale, params.username)} Ya está disponible un nuevo curso de Study AI Now!, con una ruta completa de conceptos a práctica y entrega.` }),
    action: { label: inLocale(locale, { 'zh-CN': '查看课程', 'zh-TW': '查看課程', en: 'View course', fr: 'Voir le cours', es: 'Ver curso' }), url: params.courseUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '课程简介', 'zh-TW': '課程簡介', en: 'Course overview', fr: 'Présentation du cours', es: 'Resumen del curso' }), body: params.courseDescription },
      { title: inLocale(locale, { 'zh-CN': '学习方式', 'zh-TW': '學習方式', en: 'How you learn', fr: 'Mode d’apprentissage', es: 'Cómo aprenderás' }), body: inLocale(locale, { 'zh-CN': `${lessons}，配合阅读进度、任务拆解和 CLI Lab 练习逐步推进。`, 'zh-TW': `${lessons}，配合閱讀進度、任務拆解及 CLI Lab 練習循序推進。`, en: `${lessons}, supported by reading progress, task breakdowns, and CLI Lab practice.`, fr: `${lessons}, avec progression de lecture, découpage des tâches et exercices CLI Lab.`, es: `${lessons}, con progreso de lectura, descomposición de tareas y prácticas de CLI Lab.` }) },
    ],
    tone: 'course',
  });
}

export function subscriptionInviteEmailTemplate(params: SubscriptionInviteEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, { 'zh-CN': `邀请你订阅 Study AI Now! ${params.planName}`, 'zh-TW': `邀請你訂閱 Study AI Now! ${params.planName}`, en: `You are invited to Study AI Now! ${params.planName}`, fr: `Invitation à l’abonnement Study AI Now! ${params.planName}`, es: `Invitación a Study AI Now! ${params.planName}` });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '订阅邀请', 'zh-TW': '訂閱邀請', en: 'Subscription invitation', fr: 'Invitation d’abonnement', es: 'Invitación de suscripción' }),
    title: inLocale(locale, { 'zh-CN': '解锁完整 AI 编程训练路径', 'zh-TW': '解鎖完整 AI 程式訓練路徑', en: 'Unlock the complete AI engineering path', fr: 'Débloquez le parcours complet en ingénierie IA', es: 'Desbloquea la ruta completa de ingeniería de IA' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}订阅后可以持续访问完整课程、保存学习进度，并进入更系统的实战练习。`, 'zh-TW': `${greeting(locale, params.username)}訂閱後可持續使用完整課程、儲存學習進度，並進行更系統化的實戰練習。`, en: `${greeting(locale, params.username)} With a subscription, you can keep full-course access, save progress, and follow a more systematic practice path.`, fr: `${greeting(locale, params.username)} Avec un abonnement, vous gardez l’accès aux cours complets, votre progression et une pratique plus structurée.`, es: `${greeting(locale, params.username)} Con una suscripción tendrás acceso continuo a los cursos completos, progreso guardado y práctica más estructurada.` }),
    action: { label: inLocale(locale, { 'zh-CN': '查看订阅计划', 'zh-TW': '查看訂閱方案', en: 'View plans', fr: 'Voir les formules', es: 'Ver planes' }), url: params.inviteUrl },
    sections: [
      { title: params.planName, body: inLocale(locale, { 'zh-CN': '适合希望从零散教程升级为连续训练的开发者。', 'zh-TW': '適合希望從零散教學升級為連續訓練的開發者。', en: 'For developers ready to move from scattered tutorials to continuous practice.', fr: 'Pour les développeurs qui veulent passer de tutoriels isolés à une pratique continue.', es: 'Para desarrolladores que quieren pasar de tutoriales aislados a una práctica continua.' }) },
      { title: inLocale(locale, { 'zh-CN': '你会获得', 'zh-TW': '你將獲得', en: 'Included', fr: 'Inclus', es: 'Incluye' }), body: inLocale(locale, { 'zh-CN': '完整章节、学习进度、CLI Lab 记录，以及后续课程上线通知。', 'zh-TW': '完整章節、學習進度、CLI Lab 紀錄，以及後續課程上線通知。', en: 'Full lessons, saved progress, CLI Lab records, and future course announcements.', fr: 'Les leçons complètes, la progression enregistrée, les sessions CLI Lab et les annonces de nouveaux cours.', es: 'Lecciones completas, progreso guardado, registros de CLI Lab y avisos de futuros cursos.' }) },
    ],
    tone: 'primary',
  });
}

export function subscriptionWelcomeEmailTemplate(params: SubscriptionWelcomeEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, { 'zh-CN': `欢迎订阅 Study AI Now! ${params.planName}`, 'zh-TW': `歡迎訂閱 Study AI Now! ${params.planName}`, en: `Welcome to Study AI Now! ${params.planName}`, fr: `Bienvenue dans Study AI Now! ${params.planName}`, es: `Te damos la bienvenida a Study AI Now! ${params.planName}` });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '订阅成功', 'zh-TW': '訂閱成功', en: 'Subscription active', fr: 'Abonnement activé', es: 'Suscripción activa' }),
    title: inLocale(locale, { 'zh-CN': '订阅已开通，开始系统训练', 'zh-TW': '訂閱已開通，開始系統化訓練', en: 'Your subscription is active', fr: 'Votre abonnement est actif', es: 'Tu suscripción está activa' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}恭喜你完成首次订阅。你的 ${params.planName} 权限已经开通。`, 'zh-TW': `${greeting(locale, params.username)}恭喜你完成首次訂閱。你的 ${params.planName} 權限已經開通。`, en: `${greeting(locale, params.username)} Your first subscription is complete. Your ${params.planName} access is now active.`, fr: `${greeting(locale, params.username)} Votre premier abonnement est confirmé. Votre accès ${params.planName} est désormais actif.`, es: `${greeting(locale, params.username)} Tu primera suscripción se completó. Tu acceso a ${params.planName} ya está activo.` }),
    action: { label: inLocale(locale, { 'zh-CN': '进入学习后台', 'zh-TW': '進入學習後台', en: 'Open learning space', fr: 'Ouvrir l’espace d’apprentissage', es: 'Abrir espacio de aprendizaje' }), url: params.dashboardUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '建议第一步', 'zh-TW': '建議第一步', en: 'Suggested first step', fr: 'Première étape conseillée', es: 'Primer paso recomendado' }), body: inLocale(locale, { 'zh-CN': '从 Claude Code 实战指南开始，先完成安装与第一次启动，再进入只读项目探索。', 'zh-TW': '從 Claude Code 實戰指南開始，先完成安裝與首次啟動，再進入唯讀專案探索。', en: 'Start with the Claude Code practical guide: install it, launch it once, then explore a project safely in read-only mode.', fr: 'Commencez par le guide pratique Claude Code : installez-le, lancez-le une fois, puis explorez un projet en lecture seule.', es: 'Comienza con la guía práctica de Claude Code: instálalo, ejecútalo una vez y explora un proyecto de forma segura en modo de solo lectura.' }) },
      { title: inLocale(locale, { 'zh-CN': '进度会自动保存', 'zh-TW': '進度會自動儲存', en: 'Progress is saved', fr: 'Votre progression est enregistrée', es: 'Tu progreso se guarda' }), body: inLocale(locale, { 'zh-CN': '登录后阅读课程和完成 CLI Lab 的状态会记录在你的账户里。', 'zh-TW': '登入後閱讀課程及完成 CLI Lab 的狀態會記錄在你的帳戶中。', en: 'Reading progress and completed CLI Lab work are saved to your account.', fr: 'Votre progression de lecture et vos exercices CLI Lab terminés sont enregistrés dans votre compte.', es: 'El progreso de lectura y las prácticas de CLI Lab completadas se guardan en tu cuenta.' }) },
    ],
    tone: 'billing',
  });
}

export function subscriptionRenewedEmailTemplate(params: SubscriptionRenewedEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, { 'zh-CN': `Study AI Now! ${params.planName} 已自动续期`, 'zh-TW': `Study AI Now! ${params.planName} 已自動續期`, en: `Study AI Now! ${params.planName} renewed`, fr: `Study AI Now! ${params.planName} renouvelé`, es: `Study AI Now! ${params.planName} se renovó` });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '续期成功', 'zh-TW': '續期成功', en: 'Renewal complete', fr: 'Renouvellement confirmé', es: 'Renovación completada' }),
    title: inLocale(locale, { 'zh-CN': '订阅已自动续期', 'zh-TW': '訂閱已自動續期', en: 'Your subscription renewed', fr: 'Votre abonnement a été renouvelé', es: 'Tu suscripción se renovó' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}你的 ${params.planName} 订阅已经完成自动续期，课程访问权限保持连续。`, 'zh-TW': `${greeting(locale, params.username)}你的 ${params.planName} 訂閱已完成自動續期，課程存取權限維持不中斷。`, en: `${greeting(locale, params.username)} Your ${params.planName} subscription renewed automatically and your course access continues without interruption.`, fr: `${greeting(locale, params.username)} Votre abonnement ${params.planName} a été renouvelé automatiquement et votre accès aux cours reste continu.`, es: `${greeting(locale, params.username)} Tu suscripción ${params.planName} se renovó automáticamente y tu acceso a los cursos continúa sin interrupción.` }),
    action: { label: inLocale(locale, { 'zh-CN': '查看账单与订阅', 'zh-TW': '查看帳單與訂閱', en: 'View billing', fr: 'Voir la facturation', es: 'Ver facturación' }), url: params.billingUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '当前周期', 'zh-TW': '目前週期', en: 'Current period', fr: 'Période en cours', es: 'Periodo actual' }), body: params.currentPeriodEnd ? inLocale(locale, { 'zh-CN': `本周期访问权限预计持续到 ${params.currentPeriodEnd}。`, 'zh-TW': `本週期存取權限預計持續至 ${params.currentPeriodEnd}。`, en: `Your access is expected to continue until ${params.currentPeriodEnd}.`, fr: `Votre accès devrait rester actif jusqu’au ${params.currentPeriodEnd}.`, es: `Se prevé que tu acceso continúe hasta ${params.currentPeriodEnd}.` }) : inLocale(locale, { 'zh-CN': '你可以在用户后台查看当前订阅周期。', 'zh-TW': '你可以在使用者後台查看目前的訂閱週期。', en: 'You can view your current subscription period in your account.', fr: 'Vous pouvez consulter votre période d’abonnement dans votre compte.', es: 'Puedes ver tu período de suscripción actual en tu cuenta.' }) },
      { title: inLocale(locale, { 'zh-CN': '权限状态', 'zh-TW': '權限狀態', en: 'Access status', fr: 'État de l’accès', es: 'Estado de acceso' }), body: inLocale(locale, { 'zh-CN': '完整课程、学习进度和 CLI Lab 记录会继续保留。', 'zh-TW': '完整課程、學習進度及 CLI Lab 紀錄會繼續保留。', en: 'Full courses, learning progress, and CLI Lab records remain available.', fr: 'Les cours complets, votre progression et les enregistrements CLI Lab restent disponibles.', es: 'Los cursos completos, el progreso de aprendizaje y los registros de CLI Lab seguirán disponibles.' }) },
    ],
    tone: 'billing',
  });
}

export function subscriptionCanceledEmailTemplate(params: SubscriptionCanceledEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, { 'zh-CN': `已确认取消 Study AI Now! ${params.planName}`, 'zh-TW': `已確認取消 Study AI Now! ${params.planName}`, en: `Study AI Now! ${params.planName} cancellation confirmed`, fr: `Annulation de Study AI Now! ${params.planName} confirmée`, es: `Cancelación de Study AI Now! ${params.planName} confirmada` });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '订阅取消', 'zh-TW': '訂閱取消', en: 'Subscription cancellation', fr: 'Annulation d’abonnement', es: 'Cancelación de suscripción' }),
    title: inLocale(locale, { 'zh-CN': '你的取消订阅请求已确认', 'zh-TW': '你的取消訂閱要求已確認', en: 'Your cancellation is confirmed', fr: 'Votre annulation est confirmée', es: 'Tu cancelación está confirmada' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}我们已经确认取消你的 ${params.planName} 订阅。`, 'zh-TW': `${greeting(locale, params.username)}我們已確認取消你的 ${params.planName} 訂閱。`, en: `${greeting(locale, params.username)} We have confirmed the cancellation of your ${params.planName} subscription.`, fr: `${greeting(locale, params.username)} Nous avons confirmé l’annulation de votre abonnement ${params.planName}.`, es: `${greeting(locale, params.username)} Confirmamos la cancelación de tu suscripción ${params.planName}.` }),
    action: { label: inLocale(locale, { 'zh-CN': '查看订阅状态', 'zh-TW': '查看訂閱狀態', en: 'View subscription', fr: 'Voir l’abonnement', es: 'Ver suscripción' }), url: params.billingUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '访问权限', 'zh-TW': '存取權限', en: 'Access', fr: 'Accès', es: 'Acceso' }), body: params.accessEndsAt ? inLocale(locale, { 'zh-CN': `你仍可访问已订阅内容直到 ${params.accessEndsAt}。`, 'zh-TW': `你仍可使用已訂閱內容至 ${params.accessEndsAt}。`, en: `You can continue using subscribed content until ${params.accessEndsAt}.`, fr: `Vous pouvez continuer à utiliser le contenu abonné jusqu’au ${params.accessEndsAt}.`, es: `Puedes seguir usando el contenido suscrito hasta ${params.accessEndsAt}.` }) : inLocale(locale, { 'zh-CN': '你可以在用户后台查看访问权限截止时间。', 'zh-TW': '你可以在使用者後台查看存取權限截止時間。', en: 'You can view your access end date in your account.', fr: 'Vous pouvez consulter votre date de fin d’accès dans votre compte.', es: 'Puedes ver la fecha de finalización de tu acceso en tu cuenta.' }) },
      { title: inLocale(locale, { 'zh-CN': '重新订阅', 'zh-TW': '重新訂閱', en: 'Subscribe again', fr: 'Se réabonner', es: 'Suscribirte de nuevo' }), body: inLocale(locale, { 'zh-CN': '之后如果需要继续学习完整课程，可以随时回到账户后台重新订阅。', 'zh-TW': '之後如需繼續學習完整課程，隨時可回到帳戶後台重新訂閱。', en: 'If you want to continue with full courses later, you can subscribe again from your account.', fr: 'Si vous souhaitez reprendre les cours complets plus tard, vous pouvez vous réabonner depuis votre compte.', es: 'Si más adelante quieres continuar con los cursos completos, puedes suscribirte de nuevo desde tu cuenta.' }) },
    ],
    tone: 'warning',
  });
}

export function learningReminderEmailTemplate(params: LearningReminderEmailParams) {
  const locale = emailLocale(params);
  const subject = inLocale(locale, { 'zh-CN': `继续学习：${params.courseTitle}`, 'zh-TW': `繼續學習：${params.courseTitle}`, en: `Continue learning: ${params.courseTitle}`, fr: `Reprenez votre apprentissage : ${params.courseTitle}`, es: `Sigue aprendiendo: ${params.courseTitle}` });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '学习提醒', 'zh-TW': '學習提醒', en: 'Learning reminder', fr: 'Rappel d’apprentissage', es: 'Recordatorio de aprendizaje' }),
    title: inLocale(locale, { 'zh-CN': '为下一次进步留出一点时间', 'zh-TW': '為下一次進步留一點時間', en: 'Make time for your next step', fr: 'Prenez un moment pour votre prochaine étape', es: 'Dedica un momento a tu próximo avance' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}你正在学习的《${params.courseTitle}》还在等待你继续探索。`, 'zh-TW': `${greeting(locale, params.username)}你正在學習的《${params.courseTitle}》仍在等你繼續探索。`, en: `${greeting(locale, params.username)} Your course “${params.courseTitle}” is ready when you are.`, fr: `${greeting(locale, params.username)} Votre cours « ${params.courseTitle} » vous attend.`, es: `${greeting(locale, params.username)} Tu curso «${params.courseTitle}» te espera cuando quieras continuar.` }),
    action: { label: inLocale(locale, { 'zh-CN': '继续学习', 'zh-TW': '繼續學習', en: 'Continue learning', fr: 'Reprendre', es: 'Continuar aprendiendo' }), url: params.continueUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '建议', 'zh-TW': '建議', en: 'Suggestion', fr: 'Suggestion', es: 'Sugerencia' }), body: inLocale(locale, { 'zh-CN': '从上次阅读的位置继续，用 15 分钟完成一个小节或复盘一个技能点。', 'zh-TW': '從上次閱讀的位置繼續，用 15 分鐘完成一個小節或複習一個技能點。', en: 'Resume where you stopped and use 15 minutes to finish a short lesson or review one skill.', fr: 'Reprenez où vous vous êtes arrêté et utilisez 15 minutes pour terminer une courte leçon ou revoir une compétence.', es: 'Retoma donde lo dejaste y usa 15 minutos para terminar una lección corta o repasar una habilidad.' }) },
      { title: inLocale(locale, { 'zh-CN': '你的数据', 'zh-TW': '你的資料', en: 'Your progress', fr: 'Votre progression', es: 'Tu progreso' }), body: inLocale(locale, { 'zh-CN': '登录后会继续记录课程进度，并可在岗位 JD 中看到已学技能与待补技能。', 'zh-TW': '登入後會繼續記錄課程進度，並可在職缺 JD 中看到已學技能與待補技能。', en: 'Your course progress is saved, and job descriptions can show the skills you have learned and still need to prepare.', fr: 'Votre progression est enregistrée, et les fiches de poste peuvent montrer les compétences acquises et à préparer.', es: 'Tu progreso se guarda y las descripciones de puestos pueden mostrar las habilidades aprendidas y las que debes preparar.' }) },
    ],
    tone: 'course',
  });
}

export function creatorReviewEmailTemplate(params: CreatorReviewEmailParams) {
  const locale = emailLocale(params);
  const subject = params.recommended
    ? inLocale(locale, { 'zh-CN': `你的课程已获推荐：${params.courseTitle}`, 'zh-TW': `你的課程已獲推薦：${params.courseTitle}`, en: `Your course was recommended: ${params.courseTitle}`, fr: `Votre cours a été recommandé : ${params.courseTitle}`, es: `Tu curso fue recomendado: ${params.courseTitle}` })
    : inLocale(locale, { 'zh-CN': `课程需要更新后再次提交：${params.courseTitle}`, 'zh-TW': `課程需要更新後再次提交：${params.courseTitle}`, en: `Updates needed before resubmitting: ${params.courseTitle}`, fr: `Mises à jour nécessaires avant soumission : ${params.courseTitle}`, es: `Necesita cambios antes de reenviar: ${params.courseTitle}` });
  return renderTemplate(subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '课程创作', 'zh-TW': '課程創作', en: 'Course creation', fr: 'Création de cours', es: 'Creación de cursos' }),
    title: params.recommended ? inLocale(locale, { 'zh-CN': '课程已获推荐，积分奖励已到账', 'zh-TW': '課程已獲推薦，積分獎勵已入帳', en: 'Your course is recommended and points were awarded', fr: 'Votre cours est recommandé et vos points ont été attribués', es: 'Tu curso fue recomendado y los puntos ya fueron otorgados' }) : inLocale(locale, { 'zh-CN': '审阅已完成，请根据反馈完善课程', 'zh-TW': '審閱已完成，請依回饋完善課程', en: 'Review complete — please use the feedback to improve your course', fr: 'Révision terminée — améliorez votre cours selon les retours', es: 'La revisión terminó: mejora tu curso con los comentarios' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}${params.recommended ? `《${params.courseTitle}》通过质量审阅，已进入推荐队列。` : `《${params.courseTitle}》已完成初审。`}`, 'zh-TW': `${greeting(locale, params.username)}${params.recommended ? `《${params.courseTitle}》已通過品質審閱，進入推薦佇列。` : `《${params.courseTitle}》已完成初步審閱。`}`, en: `${greeting(locale, params.username)}${params.recommended ? ` “${params.courseTitle}” passed quality review and has entered the recommendation queue.` : ` “${params.courseTitle}” completed its initial review.`}`, fr: `${greeting(locale, params.username)}${params.recommended ? ` « ${params.courseTitle} » a passé la revue qualité et entre dans la file de recommandation.` : ` « ${params.courseTitle} » a terminé sa première revue.`}`, es: `${greeting(locale, params.username)}${params.recommended ? ` «${params.courseTitle}» aprobó la revisión de calidad y entró en la cola de recomendación.` : ` «${params.courseTitle}» terminó su revisión inicial.`}` }),
    action: { label: inLocale(locale, { 'zh-CN': '查看课程创作后台', 'zh-TW': '查看課程創作後台', en: 'Open creator space', fr: 'Ouvrir l’espace créateur', es: 'Abrir espacio de creación' }), url: params.creatorUrl },
    sections: [
      { title: params.recommended ? inLocale(locale, { 'zh-CN': '下一步', 'zh-TW': '下一步', en: 'Next step', fr: 'Prochaine étape', es: 'Siguiente paso' }) : inLocale(locale, { 'zh-CN': '审阅反馈', 'zh-TW': '審閱回饋', en: 'Review feedback', fr: 'Retour de revue', es: 'Comentarios de la revisión' }), body: params.recommended ? inLocale(locale, { 'zh-CN': '继续完善课程结构与章节内容；平台会保留推荐记录和积分奖励。', 'zh-TW': '繼續完善課程結構與章節內容；平台會保留推薦紀錄及積分獎勵。', en: 'Keep improving the course structure and lessons. The platform retains the recommendation record and point award.', fr: 'Continuez à améliorer la structure et les leçons. La plateforme conserve la recommandation et les points attribués.', es: 'Sigue mejorando la estructura y las lecciones. La plataforma conserva el registro de recomendación y los puntos.' }) : (params.reviewNote || inLocale(locale, { 'zh-CN': '请补充学习目标、可验证练习和清晰的章节结构后再次提交。', 'zh-TW': '請補充學習目標、可驗證練習及清楚的章節結構後再次提交。', en: 'Add learning objectives, verifiable exercises, and a clear lesson structure before resubmitting.', fr: 'Ajoutez des objectifs, des exercices vérifiables et une structure claire avant de soumettre à nouveau.', es: 'Añade objetivos de aprendizaje, ejercicios verificables y una estructura clara antes de reenviar.' })) },
    ],
    tone: params.recommended ? 'course' : 'warning',
  });
}

export function emailServiceTestTemplate(origin: string, locale: EmailLocale = 'zh-CN') {
  return renderTemplate(inLocale(locale, { 'zh-CN': '[测试] Study AI Now! 邮件服务已启用', 'zh-TW': '[測試] Study AI Now! 電郵服務已啟用', en: '[Test] Study AI Now! email service is active', fr: '[Test] Le service e-mail Study AI Now! est actif', es: '[Prueba] El servicio de correo de Study AI Now! está activo' }), {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': 'Resend 测试', 'zh-TW': 'Resend 測試', en: 'Resend test', fr: 'Test Resend', es: 'Prueba de Resend' }),
    title: inLocale(locale, { 'zh-CN': '邮件模板与 Resend 发送功能已启用', 'zh-TW': '電郵範本與 Resend 發送功能已啟用', en: 'Email templates and Resend delivery are active', fr: 'Les modèles d’e-mail et Resend sont actifs', es: 'Las plantillas de correo y Resend están activos' }),
    intro: inLocale(locale, { 'zh-CN': '这是一封来自生产环境的测试邮件，用于确认 Study AI Now! 发件地址、Resend API Key 和邮件模板可以正常工作。', 'zh-TW': '這是一封來自正式環境的測試電郵，用以確認 Study AI Now! 寄件地址、Resend API Key 及電郵範本可正常運作。', en: 'This production test email confirms that the Study AI Now! sender, Resend API key, and email templates are working.', fr: 'Cet e-mail de test de production confirme le bon fonctionnement de l’expéditeur Study AI Now!, de la clé API Resend et des modèles.', es: 'Este correo de prueba de producción confirma que el remitente de Study AI Now!, la clave de Resend y las plantillas funcionan.' }),
    action: { label: inLocale(locale, { 'zh-CN': '打开 Study AI Now!', 'zh-TW': '開啟 Study AI Now!', en: 'Open Study AI Now!', fr: 'Ouvrir Study AI Now!', es: 'Abrir Study AI Now!' }), url: origin },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '已配置模板', 'zh-TW': '已設定範本', en: 'Configured templates', fr: 'Modèles configurés', es: 'Plantillas configuradas' }), body: inLocale(locale, { 'zh-CN': '账号安全、学习与课程、任务状态、运营和产品播报邮件均已配置。', 'zh-TW': '帳戶安全、學習與課程、任務狀態、營運與產品快訊電郵均已設定。', en: 'Account security, learning, task-status, operations, and product-update emails are configured.', fr: 'Les e-mails de sécurité, d’apprentissage, de statut, d’exploitation et de mise à jour produit sont configurés.', es: 'Están configurados los correos de seguridad, aprendizaje, estado de tareas, operaciones y novedades de producto.' }) },
      { title: inLocale(locale, { 'zh-CN': '发送服务', 'zh-TW': '發送服務', en: 'Delivery service', fr: 'Service d’envoi', es: 'Servicio de envío' }), body: inLocale(locale, { 'zh-CN': `默认发件地址为 ${DEFAULT_FROM_EMAIL}，可通过 RESEND_FROM_EMAIL 覆盖。`, 'zh-TW': `預設寄件地址為 ${DEFAULT_FROM_EMAIL}，可透過 RESEND_FROM_EMAIL 覆寫。`, en: `The default sender is ${DEFAULT_FROM_EMAIL}; RESEND_FROM_EMAIL can override it.`, fr: `L’expéditeur par défaut est ${DEFAULT_FROM_EMAIL}; RESEND_FROM_EMAIL peut le remplacer.`, es: `El remitente predeterminado es ${DEFAULT_FROM_EMAIL}; RESEND_FROM_EMAIL puede cambiarlo.` }) },
    ],
    note: inLocale(locale, { 'zh-CN': '收到此邮件代表部署后的 Worker 可以读取 EMAIL_RESEND_API_KEY，并成功调用 Resend。', 'zh-TW': '收到此電郵代表部署後的 Worker 可以讀取 EMAIL_RESEND_API_KEY，並成功呼叫 Resend。', en: 'Receiving this email confirms that the deployed Worker can read EMAIL_RESEND_API_KEY and call Resend.', fr: 'La réception de cet e-mail confirme que le Worker déployé peut lire EMAIL_RESEND_API_KEY et appeler Resend.', es: 'Recibir este correo confirma que el Worker desplegado puede leer EMAIL_RESEND_API_KEY y llamar a Resend.' }),
    tone: 'primary',
  });
}

export function securityLoginEmailTemplate(params: SecurityLoginEmailParams) {
  const locale = emailLocale(params);
  const locationLabel = params.locationLabel || inLocale(locale, { 'zh-CN': '未知位置', 'zh-TW': '未知位置', en: 'Unknown location', fr: 'Lieu inconnu', es: 'Ubicación desconocida' });
  return renderTemplate(inLocale(locale, { 'zh-CN': '安全提醒：检测到新的登录', 'zh-TW': '安全提醒：偵測到新的登入', en: 'Security alert: new sign-in detected', fr: 'Alerte de sécurité : nouvelle connexion détectée', es: 'Alerta de seguridad: se detectó un inicio de sesión nuevo' }), {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '账户安全', 'zh-TW': '帳戶安全', en: 'Account security', fr: 'Sécurité du compte', es: 'Seguridad de la cuenta' }),
    title: inLocale(locale, { 'zh-CN': '检测到新的设备或网络登录', 'zh-TW': '偵測到新的裝置或網絡登入', en: 'A new device or network signed in', fr: 'Un nouvel appareil ou réseau s’est connecté', es: 'Un dispositivo o red nuevos iniciaron sesión' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}我们检测到你的账户出现新的登录。`, 'zh-TW': `${greeting(locale, params.username)}我們偵測到你的帳戶出現新的登入。`, en: `${greeting(locale, params.username)} We detected a new sign-in to your account.`, fr: `${greeting(locale, params.username)} Nous avons détecté une nouvelle connexion à votre compte.`, es: `${greeting(locale, params.username)} Detectamos un nuevo inicio de sesión en tu cuenta.` }),
    action: { label: inLocale(locale, { 'zh-CN': '检查账户安全', 'zh-TW': '檢查帳戶安全', en: 'Review account security', fr: 'Vérifier la sécurité', es: 'Revisar seguridad de la cuenta' }), url: params.securityUrl },
    sections: [
      { title: inLocale(locale, { 'zh-CN': '登录信息', 'zh-TW': '登入資訊', en: 'Sign-in details', fr: 'Détails de connexion', es: 'Datos de inicio de sesión' }), body: inLocale(locale, { 'zh-CN': `设备或浏览器：${params.deviceLabel}\n位置：${locationLabel}\n时间：${params.occurredAt}`, 'zh-TW': `裝置或瀏覽器：${params.deviceLabel}\n位置：${locationLabel}\n時間：${params.occurredAt}`, en: `Device or browser: ${params.deviceLabel}\nLocation: ${locationLabel}\nTime: ${params.occurredAt}`, fr: `Appareil ou navigateur : ${params.deviceLabel}\nLieu : ${locationLabel}\nHeure : ${params.occurredAt}`, es: `Dispositivo o navegador: ${params.deviceLabel}\nUbicación: ${locationLabel}\nHora: ${params.occurredAt}` }) },
      { title: inLocale(locale, { 'zh-CN': '不是你本人？', 'zh-TW': '不是你本人？', en: 'Wasn’t you?', fr: 'Ce n’était pas vous ?', es: '¿No fuiste tú?' }), body: inLocale(locale, { 'zh-CN': '请立刻修改密码；修改后，现有登录会话将失效。', 'zh-TW': '請立即變更密碼；變更後，現有登入工作階段將會失效。', en: 'Change your password immediately. Existing sign-in sessions will be revoked after a password change.', fr: 'Modifiez votre mot de passe immédiatement. Les sessions existantes seront révoquées après ce changement.', es: 'Cambia tu contraseña de inmediato. Las sesiones existentes se revocarán después del cambio.' }) },
    ],
    tone: 'warning',
  });
}

export function credentialChangedEmailTemplate(params: CredentialChangedEmailParams) {
  const locale = emailLocale(params);
  const change = {
    password: inLocale(locale, { 'zh-CN': '密码', 'zh-TW': '密碼', en: 'password', fr: 'mot de passe', es: 'contraseña' }),
    email: inLocale(locale, { 'zh-CN': '绑定邮箱', 'zh-TW': '綁定電郵', en: 'email address', fr: 'adresse e-mail', es: 'correo electrónico' }),
    phone: inLocale(locale, { 'zh-CN': '绑定手机号', 'zh-TW': '綁定手機號碼', en: 'phone number', fr: 'numéro de téléphone', es: 'número de teléfono' }),
    account_deletion: inLocale(locale, { 'zh-CN': '账户注销', 'zh-TW': '帳戶註銷', en: 'account deletion', fr: 'suppression du compte', es: 'eliminación de la cuenta' }),
  }[params.change];
  return renderTemplate(inLocale(locale, { 'zh-CN': `已确认${change}变更`, 'zh-TW': `已確認${change}變更`, en: `${change} change confirmed`, fr: `Modification du ${change} confirmée`, es: `Cambio de ${change} confirmado` }), {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '账户安全', 'zh-TW': '帳戶安全', en: 'Account security', fr: 'Sécurité du compte', es: 'Seguridad de la cuenta' }),
    title: inLocale(locale, { 'zh-CN': `你的${change}已更新`, 'zh-TW': `你的${change}已更新`, en: `Your ${change} was updated`, fr: `Votre ${change} a été modifié`, es: `Tu ${change} se actualizó` }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}我们确认你的${change}已成功变更。`, 'zh-TW': `${greeting(locale, params.username)}我們確認你的${change}已成功變更。`, en: `${greeting(locale, params.username)} We confirmed that your ${change} was changed successfully.`, fr: `${greeting(locale, params.username)} Nous confirmons que votre ${change} a bien été modifié.`, es: `${greeting(locale, params.username)} Confirmamos que tu ${change} se modificó correctamente.` }),
    action: { label: inLocale(locale, { 'zh-CN': '检查账户安全', 'zh-TW': '檢查帳戶安全', en: 'Review account security', fr: 'Vérifier la sécurité', es: 'Revisar seguridad de la cuenta' }), url: params.securityUrl },
    sections: [{ title: inLocale(locale, { 'zh-CN': '不是你本人操作？', 'zh-TW': '不是你本人操作？', en: 'Wasn’t you?', fr: 'Ce n’était pas vous ?', es: '¿No fuiste tú?' }), body: inLocale(locale, { 'zh-CN': '请立即检查账户，并通过设置页面修改密码或联系官方邮箱。', 'zh-TW': '請立即檢查帳戶，並透過設定頁面變更密碼或聯絡官方電郵。', en: 'Review your account immediately, change your password in Settings, or contact the official email address.', fr: 'Vérifiez votre compte immédiatement, changez votre mot de passe dans les réglages ou contactez l’adresse officielle.', es: 'Revisa tu cuenta de inmediato, cambia tu contraseña en Configuración o contacta con la dirección oficial.' }) }],
    tone: 'warning',
  });
}

export function onboardingEmailTemplate(params: OnboardingEmailParams) {
  const locale = emailLocale(params);
  const content = {
    1: {
      subject: inLocale(locale, { 'zh-CN': '欢迎来到 Study AI Now! 从第一门课开始', 'zh-TW': '歡迎來到 Study AI Now! 從第一門課開始', en: 'Welcome to Study AI Now! Start your first course', fr: 'Bienvenue dans Study AI Now! Commencez votre premier cours', es: 'Te damos la bienvenida a Study AI Now! Empieza tu primer curso' }),
      title: inLocale(locale, { 'zh-CN': '用一小时开始你的 AI 学习路径', 'zh-TW': '用一小時開始你的 AI 學習路徑', en: 'Start your AI learning path in an hour', fr: 'Commencez votre parcours IA en une heure', es: 'Empieza tu ruta de IA en una hora' }),
      body: inLocale(locale, { 'zh-CN': '选择一门课程，阅读第一个小节，并把一个可实践的问题带进学习过程。', 'zh-TW': '選擇一門課程、閱讀第一個單元，並把一個可實作的問題帶進學習過程。', en: 'Choose a course, read the first lesson, and bring one practical question into your learning.', fr: 'Choisissez un cours, lisez la première leçon et apportez une question pratique à votre apprentissage.', es: 'Elige un curso, lee la primera lección y lleva una pregunta práctica a tu aprendizaje.' }),
    },
    3: {
      subject: inLocale(locale, { 'zh-CN': 'Study AI Now! 第 3 天：把课程变成练习', 'zh-TW': 'Study AI Now! 第 3 天：把課程變成練習', en: 'Study AI Now! Day 3: turn a course into practice', fr: 'Study AI Now! Jour 3 : passer du cours à la pratique', es: 'Study AI Now! Día 3: convierte el curso en práctica' }),
      title: inLocale(locale, { 'zh-CN': '完成一个小节，再做一次实践', 'zh-TW': '完成一個單元，再做一次實作', en: 'Finish one lesson, then practise once', fr: 'Terminez une leçon, puis pratiquez une fois', es: 'Termina una lección y practica una vez' }),
      body: inLocale(locale, { 'zh-CN': '课程中的技能点可以对应真实职位 JD。用一个小节和一次练习，开始建立可展示的能力。', 'zh-TW': '課程中的技能點可對應真實職缺 JD。用一個單元和一次練習，開始建立可展示的能力。', en: 'Course skills can connect to real job descriptions. One lesson and one practice can start building demonstrable capability.', fr: 'Les compétences du cours se relient aux fiches de poste réelles. Une leçon et un exercice peuvent commencer à bâtir une compétence démontrable.', es: 'Las habilidades del curso se conectan con descripciones reales de empleo. Una lección y una práctica pueden comenzar a crear capacidad demostrable.' }),
    },
    7: {
      subject: inLocale(locale, { 'zh-CN': 'Study AI Now! 第 7 天：规划下一步', 'zh-TW': 'Study AI Now! 第 7 天：規劃下一步', en: 'Study AI Now! Day 7: plan your next step', fr: 'Study AI Now! Jour 7 : planifiez la suite', es: 'Study AI Now! Día 7: planifica tu siguiente paso' }),
      title: inLocale(locale, { 'zh-CN': '让学习记录服务于下一份工作', 'zh-TW': '讓學習紀錄服務於下一份工作', en: 'Put your learning record to work', fr: 'Mettez votre parcours d’apprentissage à profit', es: 'Pon tu historial de aprendizaje a trabajar' }),
      body: inLocale(locale, { 'zh-CN': '查看已学技能与职位 JD 的关联，选择下一门课、一个职位目标或一份简历草稿。', 'zh-TW': '查看已學技能與職缺 JD 的關聯，選擇下一門課、一個職缺目標或一份履歷草稿。', en: 'Review the link between learned skills and job descriptions, then choose your next course, role target, or resume draft.', fr: 'Examinez le lien entre vos compétences et les fiches de poste, puis choisissez le prochain cours, poste cible ou brouillon de CV.', es: 'Revisa la relación entre tus habilidades y las descripciones de puestos, y elige tu próximo curso, puesto objetivo o borrador de CV.' }),
    },
  }[params.day];
  return renderTemplate(content.subject, {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': `新手指引 · 第 ${params.day} 天`, 'zh-TW': `新手指引 · 第 ${params.day} 天`, en: `Getting started · Day ${params.day}`, fr: `Bien démarrer · Jour ${params.day}`, es: `Primeros pasos · Día ${params.day}` }),
    title: content.title,
    intro: `${greeting(locale, params.username)} ${content.body}`,
    action: { label: inLocale(locale, { 'zh-CN': '进入我的学习空间', 'zh-TW': '進入我的學習空間', en: 'Open my learning space', fr: 'Ouvrir mon espace', es: 'Abrir mi espacio de aprendizaje' }), url: params.dashboardUrl },
    tone: 'course',
  });
}

export function reengagementEmailTemplate(params: ReengagementEmailParams) {
  const locale = emailLocale(params);
  return renderTemplate(inLocale(locale, { 'zh-CN': '我们想念你的学习路径', 'zh-TW': '我們想念你的學習路徑', en: 'We miss your learning path', fr: 'Votre parcours nous manque', es: 'Extrañamos tu ruta de aprendizaje' }), {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '继续学习', 'zh-TW': '繼續學習', en: 'Continue learning', fr: 'Reprendre', es: 'Continuar aprendiendo' }),
    title: inLocale(locale, { 'zh-CN': '随时回来，从上次的位置继续', 'zh-TW': '隨時回來，從上次的位置繼續', en: 'Come back whenever you are ready', fr: 'Revenez quand vous serez prêt', es: 'Vuelve cuando estés listo' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}你的课程、学习进度和已保存的职位都还在。`, 'zh-TW': `${greeting(locale, params.username)}你的課程、學習進度與已儲存的職缺都還在。`, en: `${greeting(locale, params.username)} Your courses, learning progress, and saved jobs are still here.`, fr: `${greeting(locale, params.username)} Vos cours, votre progression et vos offres enregistrées sont toujours là.`, es: `${greeting(locale, params.username)} Tus cursos, progreso de aprendizaje y empleos guardados siguen aquí.` }),
    action: { label: inLocale(locale, { 'zh-CN': '回到学习空间', 'zh-TW': '回到學習空間', en: 'Return to learning', fr: 'Revenir à l’apprentissage', es: 'Volver al aprendizaje' }), url: params.dashboardUrl },
    sections: [{ title: inLocale(locale, { 'zh-CN': '小建议', 'zh-TW': '小建議', en: 'A small suggestion', fr: 'Une petite suggestion', es: 'Una pequeña sugerencia' }), body: inLocale(locale, { 'zh-CN': '只需完成一个小节或复盘一个技能点，就能重新建立节奏。', 'zh-TW': '只需完成一個單元或複習一個技能點，就能重新建立節奏。', en: 'Finishing one lesson or reviewing one skill is enough to restart your rhythm.', fr: 'Terminer une leçon ou revoir une compétence suffit pour reprendre votre rythme.', es: 'Terminar una lección o repasar una habilidad basta para recuperar el ritmo.' }) }],
    tone: 'course',
  });
}

export function resumeReadyEmailTemplate(params: ResumeReadyEmailParams) {
  const locale = emailLocale(params);
  return renderTemplate(inLocale(locale, { 'zh-CN': `你的 ${params.targetRole} 简历草稿已生成`, 'zh-TW': `你的 ${params.targetRole} 履歷草稿已產生`, en: `Your ${params.targetRole} resume draft is ready`, fr: `Votre brouillon de CV ${params.targetRole} est prêt`, es: `Tu borrador de CV para ${params.targetRole} está listo` }), {
    locale,
    eyebrow: inLocale(locale, { 'zh-CN': '简历生成', 'zh-TW': '履歷產生', en: 'Resume maker', fr: 'Générateur de CV', es: 'Generador de CV' }),
    title: inLocale(locale, { 'zh-CN': '请先核对事实，再导出简历', 'zh-TW': '請先核對事實，再匯出履歷', en: 'Review the facts before exporting', fr: 'Vérifiez les faits avant l’export', es: 'Revisa los datos antes de exportar' }),
    intro: inLocale(locale, { 'zh-CN': `${greeting(locale, params.username)}你的 ${params.targetRole} 简历草稿和面试复习题已准备好。`, 'zh-TW': `${greeting(locale, params.username)}你的 ${params.targetRole} 履歷草稿和面試複習題已準備好。`, en: `${greeting(locale, params.username)} Your ${params.targetRole} resume draft and interview review questions are ready.`, fr: `${greeting(locale, params.username)} Votre brouillon de CV ${params.targetRole} et vos questions de préparation sont prêts.`, es: `${greeting(locale, params.username)} Tu borrador de CV para ${params.targetRole} y tus preguntas de preparación están listos.` }),
    action: { label: inLocale(locale, { 'zh-CN': '查看简历草稿', 'zh-TW': '查看履歷草稿', en: 'Review resume draft', fr: 'Voir le brouillon', es: 'Revisar borrador de CV' }), url: params.resumeUrl },
    sections: [{ title: inLocale(locale, { 'zh-CN': '重要', 'zh-TW': '重要', en: 'Important', fr: 'Important', es: 'Importante' }), body: inLocale(locale, { 'zh-CN': '系统生成的是可审阅草稿。请确认经历、日期、技能和联系方式真实准确后，再导出或投递。', 'zh-TW': '系統產生的是可審閱草稿。請確認經歷、日期、技能及聯絡方式真實準確後，再匯出或投遞。', en: 'This is a reviewable draft. Confirm that experience, dates, skills, and contact details are true and accurate before exporting or applying.', fr: 'Il s’agit d’un brouillon à vérifier. Confirmez l’exactitude de l’expérience, des dates, des compétences et des coordonnées avant export ou candidature.', es: 'Este es un borrador revisable. Confirma que experiencia, fechas, habilidades y datos de contacto sean verdaderos y correctos antes de exportar o postularte.' }) }],
    tone: 'course',
  });
}

export type CatalogueEmailTemplate = 'new-message' | 'collaboration-invite' | 'task-status' | 'interaction-feedback' | 'milestone-report' | 'release-notes' | 'promotion' | 'survey' | 'newsletter' | 'account-deletion';

export function catalogueEmailTemplate(key: CatalogueEmailTemplate, locale: EmailLocale, actionUrl: string) {
  const copy: Record<CatalogueEmailTemplate, Record<EmailLocale, { subject: string; eyebrow: string; title: string; intro: string; action: string; detail: string; tone: EmailTone }>> = {
    'new-message': {
      'zh-CN': { subject: 'Study AI Now! 有新的站内消息', eyebrow: '消息提醒', title: '你收到一条新消息', intro: '客服或协作者已回复你的消息。', action: '查看消息', detail: '登录后可在提醒中心查看完整内容并继续回复。', tone: 'primary' }, 'zh-TW': { subject: 'Study AI Now! 有新的站內訊息', eyebrow: '訊息提醒', title: '你收到一則新訊息', intro: '客服或協作者已回覆你的訊息。', action: '查看訊息', detail: '登入後可在提醒中心查看完整內容並繼續回覆。', tone: 'primary' }, en: { subject: 'Study AI Now! has a new message', eyebrow: 'Message alert', title: 'You received a new message', intro: 'Support or a collaborator replied to you.', action: 'View message', detail: 'Sign in to read the full message and reply in Notifications.', tone: 'primary' }, fr: { subject: 'Nouveau message Study AI Now!', eyebrow: 'Alerte message', title: 'Vous avez reçu un message', intro: 'Le support ou un collaborateur vous a répondu.', action: 'Voir le message', detail: 'Connectez-vous pour lire et répondre dans les notifications.', tone: 'primary' }, es: { subject: 'Study AI Now! tiene un mensaje nuevo', eyebrow: 'Aviso de mensaje', title: 'Recibiste un mensaje nuevo', intro: 'Soporte o un colaborador te respondió.', action: 'Ver mensaje', detail: 'Inicia sesión para leer el mensaje completo y responder en Notificaciones.', tone: 'primary' },
    },
    'collaboration-invite': {
      'zh-CN': { subject: '你收到一个协作邀请', eyebrow: '协作邀请', title: '有人邀请你加入协作', intro: '打开邀请可查看项目、团队或文档协作详情。', action: '查看邀请', detail: '接受邀请前，请确认邀请人和项目名称。', tone: 'course' }, 'zh-TW': { subject: '你收到一個協作邀請', eyebrow: '協作邀請', title: '有人邀請你加入協作', intro: '開啟邀請可查看專案、團隊或文件協作詳情。', action: '查看邀請', detail: '接受邀請前，請確認邀請人和專案名稱。', tone: 'course' }, en: { subject: 'You received a collaboration invite', eyebrow: 'Collaboration invite', title: 'You were invited to collaborate', intro: 'Open the invite to view the project, team, or document details.', action: 'View invite', detail: 'Confirm the inviter and project name before accepting.', tone: 'course' }, fr: { subject: 'Vous avez reçu une invitation de collaboration', eyebrow: 'Invitation de collaboration', title: 'Vous êtes invité à collaborer', intro: 'Ouvrez l’invitation pour voir le projet, l’équipe ou le document.', action: 'Voir l’invitation', detail: 'Vérifiez l’invitant et le projet avant d’accepter.', tone: 'course' }, es: { subject: 'Recibiste una invitación de colaboración', eyebrow: 'Invitación de colaboración', title: 'Te invitaron a colaborar', intro: 'Abre la invitación para ver los detalles del proyecto, equipo o documento.', action: 'Ver invitación', detail: 'Confirma quién invita y el nombre del proyecto antes de aceptar.', tone: 'course' },
    },
    'task-status': {
      'zh-CN': { subject: '你的 Study AI Now! 任务已完成', eyebrow: '任务状态', title: '任务已完成，可以查看结果', intro: '你的请求已经完成处理。', action: '查看结果', detail: '如果结果包含导出文件，请仅通过登录后的安全链接下载。', tone: 'course' }, 'zh-TW': { subject: '你的 Study AI Now! 任務已完成', eyebrow: '任務狀態', title: '任務已完成，可以查看結果', intro: '你的要求已完成處理。', action: '查看結果', detail: '如結果包含匯出檔案，請僅透過登入後的安全連結下載。', tone: 'course' }, en: { subject: 'Your Study AI Now! task is complete', eyebrow: 'Task status', title: 'Your result is ready', intro: 'Your request has finished processing.', action: 'View result', detail: 'If there is an export, download it only through a signed-in secure link.', tone: 'course' }, fr: { subject: 'Votre tâche Study AI Now! est terminée', eyebrow: 'État de la tâche', title: 'Votre résultat est prêt', intro: 'Votre demande a été traitée.', action: 'Voir le résultat', detail: 'Pour un export, téléchargez uniquement via un lien sécurisé après connexion.', tone: 'course' }, es: { subject: 'Tu tarea de Study AI Now! se completó', eyebrow: 'Estado de tarea', title: 'Tu resultado está listo', intro: 'Tu solicitud terminó de procesarse.', action: 'Ver resultado', detail: 'Si existe una exportación, descárgala solo desde un enlace seguro tras iniciar sesión.', tone: 'course' },
    },
    'interaction-feedback': {
      'zh-CN': { subject: '你的内容收到了新的互动', eyebrow: '互动反馈', title: '有人与你的内容互动', intro: '你的课程或内容收到新的点赞、评论或收藏。', action: '查看互动', detail: '登录后可查看互动详情并继续交流。', tone: 'primary' }, 'zh-TW': { subject: '你的內容收到新的互動', eyebrow: '互動回饋', title: '有人與你的內容互動', intro: '你的課程或內容收到新的按讚、留言或收藏。', action: '查看互動', detail: '登入後可查看互動詳情並繼續交流。', tone: 'primary' }, en: { subject: 'Your content has new activity', eyebrow: 'Interaction feedback', title: 'Someone interacted with your content', intro: 'Your course or content received a new like, comment, or bookmark.', action: 'View activity', detail: 'Sign in to see the details and respond.', tone: 'primary' }, fr: { subject: 'Votre contenu a une nouvelle interaction', eyebrow: 'Retour d’interaction', title: 'Quelqu’un a interagi avec votre contenu', intro: 'Votre cours ou contenu a reçu un j’aime, un commentaire ou un favori.', action: 'Voir l’activité', detail: 'Connectez-vous pour voir les détails et répondre.', tone: 'primary' }, es: { subject: 'Tu contenido tiene actividad nueva', eyebrow: 'Comentarios de interacción', title: 'Alguien interactuó con tu contenido', intro: 'Tu curso o contenido recibió un me gusta, comentario o marcador.', action: 'Ver actividad', detail: 'Inicia sesión para ver los detalles y responder.', tone: 'primary' },
    },
    'milestone-report': {
      'zh-CN': { subject: '你的 Study AI Now! 学习里程碑', eyebrow: '学习报告', title: '看看本周期的学习成果', intro: '你的学习记录已经汇总，可以查看进度、技能和下一步建议。', action: '查看学习报告', detail: '报告只呈现账户内记录的学习与练习数据。', tone: 'course' }, 'zh-TW': { subject: '你的 Study AI Now! 學習里程碑', eyebrow: '學習報告', title: '查看本週期的學習成果', intro: '你的學習紀錄已彙整，可查看進度、技能與下一步建議。', action: '查看學習報告', detail: '報告只呈現帳戶內紀錄的學習與練習資料。', tone: 'course' }, en: { subject: 'Your Study AI Now! learning milestone', eyebrow: 'Learning report', title: 'See your progress this period', intro: 'Your learning records are ready to review, with progress, skills, and next-step suggestions.', action: 'View learning report', detail: 'The report contains only learning and practice data recorded in your account.', tone: 'course' }, fr: { subject: 'Votre étape d’apprentissage Study AI Now!', eyebrow: 'Rapport d’apprentissage', title: 'Découvrez vos progrès sur cette période', intro: 'Vos données d’apprentissage sont prêtes, avec progression, compétences et suggestions.', action: 'Voir le rapport', detail: 'Le rapport ne contient que les données enregistrées dans votre compte.', tone: 'course' }, es: { subject: 'Tu hito de aprendizaje de Study AI Now!', eyebrow: 'Informe de aprendizaje', title: 'Mira tu progreso de este período', intro: 'Tus registros están listos para revisar, con progreso, habilidades y sugerencias.', action: 'Ver informe', detail: 'El informe contiene solo datos de aprendizaje y práctica registrados en tu cuenta.', tone: 'course' },
    },
    'release-notes': {
      'zh-CN': { subject: 'Study AI Now! 产品更新', eyebrow: '产品更新', title: '新功能已经上线', intro: '我们发布了新的学习、职位或账户功能。', action: '查看更新', detail: '更新说明会标明功能范围与使用方式。', tone: 'primary' }, 'zh-TW': { subject: 'Study AI Now! 產品更新', eyebrow: '產品更新', title: '新功能已經上線', intro: '我們發布了新的學習、職缺或帳戶功能。', action: '查看更新', detail: '更新說明會標明功能範圍與使用方式。', tone: 'primary' }, en: { subject: 'Study AI Now! product update', eyebrow: 'Product update', title: 'New features are live', intro: 'We released new learning, jobs, or account capabilities.', action: 'View update', detail: 'Release notes describe the scope and how to use each feature.', tone: 'primary' }, fr: { subject: 'Mise à jour produit Study AI Now!', eyebrow: 'Mise à jour produit', title: 'De nouvelles fonctionnalités sont disponibles', intro: 'Nous avons publié de nouvelles fonctionnalités d’apprentissage, d’emploi ou de compte.', action: 'Voir la mise à jour', detail: 'Les notes de version expliquent le périmètre et l’utilisation de chaque fonctionnalité.', tone: 'primary' }, es: { subject: 'Actualización de Study AI Now!', eyebrow: 'Actualización del producto', title: 'Ya hay funciones nuevas', intro: 'Publicamos nuevas funciones de aprendizaje, empleos o cuenta.', action: 'Ver actualización', detail: 'Las notas de versión explican el alcance y el uso de cada función.', tone: 'primary' },
    },
    'promotion': {
      'zh-CN': { subject: 'Study AI Now! 活动与奖励', eyebrow: '活动与奖励', title: '发现新的学习活动', intro: '我们准备了新的活动、推荐奖励或学习机会。', action: '查看活动', detail: '活动资格、时间与规则会在页面中明确说明。', tone: 'billing' }, 'zh-TW': { subject: 'Study AI Now! 活動與獎勵', eyebrow: '活動與獎勵', title: '發現新的學習活動', intro: '我們準備了新的活動、推薦獎勵或學習機會。', action: '查看活動', detail: '活動資格、時間與規則會在頁面中清楚說明。', tone: 'billing' }, en: { subject: 'Study AI Now! events and rewards', eyebrow: 'Events and rewards', title: 'Discover a new learning opportunity', intro: 'We prepared a new event, referral reward, or learning opportunity.', action: 'View event', detail: 'Eligibility, dates, and rules are stated clearly on the event page.', tone: 'billing' }, fr: { subject: 'Événements et récompenses Study AI Now!', eyebrow: 'Événements et récompenses', title: 'Découvrez une nouvelle occasion d’apprendre', intro: 'Nous avons préparé un événement, une récompense de parrainage ou une occasion d’apprentissage.', action: 'Voir l’événement', detail: 'Les conditions, dates et règles sont indiquées clairement sur la page.', tone: 'billing' }, es: { subject: 'Eventos y recompensas de Study AI Now!', eyebrow: 'Eventos y recompensas', title: 'Descubre una nueva oportunidad de aprendizaje', intro: 'Preparamos un evento, recompensa por referidos u oportunidad de aprendizaje.', action: 'Ver evento', detail: 'Los requisitos, fechas y reglas se indican claramente en la página.', tone: 'billing' },
    },
    'survey': {
      'zh-CN': { subject: '邀请你参与 Study AI Now! 体验调研', eyebrow: '体验调研', title: '你的意见能帮助我们改进', intro: '我们想了解你对学习、职位和工具体验的看法。', action: '参与调研', detail: '调研为自愿参与，结果仅用于产品改进。', tone: 'primary' }, 'zh-TW': { subject: '邀請你參與 Study AI Now! 體驗調研', eyebrow: '體驗調研', title: '你的意見能協助我們改進', intro: '我們想了解你對學習、職缺與工具體驗的看法。', action: '參與調研', detail: '調研為自願參與，結果僅用於產品改進。', tone: 'primary' }, en: { subject: 'You are invited to a Study AI Now! survey', eyebrow: 'Feedback survey', title: 'Your feedback helps us improve', intro: 'We would like to understand your experience with learning, jobs, and tools.', action: 'Take survey', detail: 'Participation is optional and responses are used only to improve the product.', tone: 'primary' }, fr: { subject: 'Invitation à une enquête Study AI Now!', eyebrow: 'Enquête', title: 'Votre avis nous aide à nous améliorer', intro: 'Nous souhaitons comprendre votre expérience des cours, emplois et outils.', action: 'Répondre', detail: 'La participation est facultative et les réponses servent uniquement à améliorer le produit.', tone: 'primary' }, es: { subject: 'Invitación a una encuesta de Study AI Now!', eyebrow: 'Encuesta de opinión', title: 'Tus comentarios nos ayudan a mejorar', intro: 'Queremos conocer tu experiencia con aprendizaje, empleos y herramientas.', action: 'Responder encuesta', detail: 'La participación es opcional y las respuestas se usan solo para mejorar el producto.', tone: 'primary' },
    },
    'newsletter': {
      'zh-CN': { subject: 'Study AI Now! 本期资讯', eyebrow: '公司动态', title: '本期精选内容已经准备好', intro: '查看课程、行业资讯、实践案例与平台动态。', action: '阅读本期资讯', detail: '你可随时在设置中调整此类邮件偏好。', tone: 'course' }, 'zh-TW': { subject: 'Study AI Now! 本期資訊', eyebrow: '公司動態', title: '本期精選內容已經準備好', intro: '查看課程、產業資訊、實作案例與平台動態。', action: '閱讀本期資訊', detail: '你可隨時在設定中調整此類電郵偏好。', tone: 'course' }, en: { subject: 'Study AI Now! news for this issue', eyebrow: 'Company news', title: 'This issue is ready to read', intro: 'Explore courses, industry news, practical cases, and platform updates.', action: 'Read this issue', detail: 'You can change this email preference at any time in Settings.', tone: 'course' }, fr: { subject: 'Actualités Study AI Now!', eyebrow: 'Actualités', title: 'La sélection de ce numéro est prête', intro: 'Découvrez les cours, actualités du secteur, cas pratiques et nouveautés de la plateforme.', action: 'Lire ce numéro', detail: 'Vous pouvez modifier cette préférence à tout moment dans les réglages.', tone: 'course' }, es: { subject: 'Noticias de Study AI Now!', eyebrow: 'Noticias de la empresa', title: 'La selección de este número está lista', intro: 'Explora cursos, noticias del sector, casos prácticos y novedades de la plataforma.', action: 'Leer este número', detail: 'Puedes cambiar esta preferencia de correo en cualquier momento en Configuración.', tone: 'course' },
    },
    'account-deletion': {
      'zh-CN': { subject: 'Study AI Now! 账户注销确认', eyebrow: '账户注销', title: '你的账户注销申请已确认', intro: '我们已收到并确认你的账户删除请求。', action: '查看账户状态', detail: '删除前请确认需要保留的学习记录或导出内容；完成后将无法恢复。', tone: 'warning' }, 'zh-TW': { subject: 'Study AI Now! 帳戶註銷確認', eyebrow: '帳戶註銷', title: '你的帳戶註銷申請已確認', intro: '我們已收到並確認你的帳戶刪除要求。', action: '查看帳戶狀態', detail: '刪除前請確認需要保留的學習紀錄或匯出內容；完成後將無法復原。', tone: 'warning' }, en: { subject: 'Study AI Now! account deletion confirmation', eyebrow: 'Account deletion', title: 'Your account deletion request is confirmed', intro: 'We received and confirmed your request to delete your account.', action: 'View account status', detail: 'Keep any learning records or exports you need before deletion; it cannot be undone after completion.', tone: 'warning' }, fr: { subject: 'Confirmation de suppression du compte Study AI Now!', eyebrow: 'Suppression du compte', title: 'Votre demande de suppression est confirmée', intro: 'Nous avons reçu et confirmé votre demande de suppression de compte.', action: 'Voir l’état du compte', detail: 'Conservez les dossiers ou exports nécessaires avant suppression ; elle sera irréversible.', tone: 'warning' }, es: { subject: 'Confirmación de eliminación de cuenta de Study AI Now!', eyebrow: 'Eliminación de cuenta', title: 'Tu solicitud de eliminación está confirmada', intro: 'Recibimos y confirmamos tu solicitud para eliminar la cuenta.', action: 'Ver estado de cuenta', detail: 'Guarda los registros o exportaciones necesarios antes de eliminar; no se podrá deshacer.', tone: 'warning' },
    },
  };
  const item = copy[key][locale];
  return renderTemplate(item.subject, { locale, eyebrow: item.eyebrow, title: item.title, intro: item.intro, action: { label: item.action, url: actionUrl }, sections: [{ title: item.eyebrow, body: item.detail }], tone: item.tone });
}

export async function sendVerificationEmail(
  env: Env,
  request: Request,
  email: string,
  username: string,
  token: string,
  recipient?: { userId: string; locale?: EmailLocale },
) {
  const url = verificationUrl(env, request, token);

  if (!hasResendConfig(env)) {
    return {
      sent: false,
      reason: 'resend_not_configured',
      ...(canUseDevelopmentVerificationLink(env, request) ? { verification_url: url } : {}),
    };
  }

  const template = verificationEmailTemplate({ username, verificationUrl: url, locale: recipient?.locale });
  if (!recipient) return sendEmail(env, { to: email, ...template });
  const tokenHash = await sha256Base64Url(token);
  return sendUserEmail(env, {
    userId: recipient.userId,
    to: email,
    locale: recipient.locale,
    eventType: 'account_verification',
    category: 'transactional',
    idempotencyKey: `studyainow/account-verification/${tokenHash}`,
    ...template,
  });
}

export async function sendPasswordResetEmail(
  env: Env,
  request: Request,
  email: string,
  username: string,
  token: string,
  recipient?: { userId: string; locale?: EmailLocale },
) {
  const resetUrl = passwordResetUrl(env, request, token);
  const template = passwordResetEmailTemplate({ username, resetUrl, locale: recipient?.locale });
  if (!recipient) return sendEmail(env, { to: email, ...template });
  const tokenHash = await sha256Base64Url(token);
  return sendUserEmail(env, {
    userId: recipient.userId,
    to: email,
    locale: recipient.locale,
    eventType: 'password_reset_requested',
    category: 'transactional',
    idempotencyKey: `studyainow/password-reset/${tokenHash}`,
    ...template,
  });
}

export async function sendCreatorReviewEmail(
  env: Env,
  email: string,
  params: CreatorReviewEmailParams & { userId?: string; courseId?: string },
) {
  const template = creatorReviewEmailTemplate(params);
  if (!params.userId) return sendEmail(env, { to: email, ...template });
  return sendUserEmail(env, {
    userId: params.userId,
    to: email,
    locale: params.locale,
    eventType: 'creator_course_review',
    category: 'engagement',
    idempotencyKey: `studyainow/creator-review/${params.courseId ?? crypto.randomUUID()}/${params.recommended ? 'recommended' : 'changes-requested'}`,
    ...template,
  });
}

export async function sendSecurityLoginEmail(env: Env, email: string, params: SecurityLoginEmailParams & { userId: string; deviceFingerprint: string }) {
  const template = securityLoginEmailTemplate(params);
  return sendUserEmail(env, {
    userId: params.userId,
    to: email,
    locale: params.locale,
    eventType: 'security_new_login',
    category: 'transactional',
    idempotencyKey: `studyainow/security-login/${params.userId}/${params.deviceFingerprint}`,
    ...template,
  });
}

export async function sendCredentialChangedEmail(env: Env, email: string, params: CredentialChangedEmailParams & { userId: string; eventId: string }) {
  const template = credentialChangedEmailTemplate(params);
  return sendUserEmail(env, {
    userId: params.userId,
    to: email,
    locale: params.locale,
    eventType: `credential_${params.change}`,
    category: 'transactional',
    idempotencyKey: `studyainow/credential-change/${params.eventId}`,
    ...template,
  });
}

export async function sendOnboardingEmail(env: Env, email: string, params: OnboardingEmailParams & { userId: string }) {
  const template = onboardingEmailTemplate(params);
  return sendUserEmail(env, {
    userId: params.userId,
    to: email,
    locale: params.locale,
    eventType: `onboarding_day_${params.day}`,
    category: 'engagement',
    idempotencyKey: `studyainow/onboarding/${params.userId}/day-${params.day}`,
    ...template,
  });
}

export async function sendReengagementEmail(env: Env, email: string, params: ReengagementEmailParams & { userId: string; periodKey: string }) {
  const template = reengagementEmailTemplate(params);
  return sendUserEmail(env, {
    userId: params.userId,
    to: email,
    locale: params.locale,
    eventType: 'reengagement_30d',
    category: 'marketing',
    idempotencyKey: `studyainow/reengagement/${params.userId}/${params.periodKey}`,
    ...template,
  });
}

export async function sendResumeReadyEmail(env: Env, email: string, params: ResumeReadyEmailParams & { userId: string; resumeId: string }) {
  const template = resumeReadyEmailTemplate(params);
  return sendUserEmail(env, {
    userId: params.userId,
    to: email,
    locale: params.locale,
    eventType: 'resume_ready',
    category: 'engagement',
    idempotencyKey: `studyainow/resume-ready/${params.resumeId}`,
    ...template,
  });
}
