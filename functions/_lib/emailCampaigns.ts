import { normalizeEmailLocale, sendOnboardingEmail, sendReengagementEmail, type EmailLocale } from './email';

type CampaignUser = {
  id: string;
  email: string;
  username: string | null;
  display_name: string;
  preferred_locale: string | null;
};

function localeFor(user: CampaignUser): EmailLocale {
  return normalizeEmailLocale(user.preferred_locale);
}

async function sendOnboardingStage(env: Env, day: 1 | 3 | 7, limit: number) {
  const users = await env.DB
    .prepare(
      `SELECT users.id, users.email, users.username, users.display_name, users.preferred_locale
       FROM users
       WHERE users.status = 'active'
         AND users.email_verified_at IS NOT NULL
         AND date(users.email_verified_at, '+' || ? || ' days') = date('now')
         AND NOT EXISTS (
           SELECT 1 FROM email_deliveries
           WHERE email_deliveries.user_id = users.id
             AND email_deliveries.event_type = ?
         )
       ORDER BY users.email_verified_at ASC
       LIMIT ?`,
    )
    .bind(day, `onboarding_day_${day}`, limit)
    .all<CampaignUser>();

  const results = await Promise.allSettled(
    users.results.map((user) => sendOnboardingEmail(env, user.email, {
      userId: user.id,
      username: user.username ?? user.display_name,
      locale: localeFor(user),
      day,
      dashboardUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me`,
    })),
  );
  return {
    selected: users.results.length,
    sent: results.filter((result) => result.status === 'fulfilled' && result.value.sent).length,
    skipped: results.filter((result) => result.status === 'fulfilled' && !result.value.sent).length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}

async function sendReengagement(env: Env, limit: number) {
  const users = await env.DB
    .prepare(
      `SELECT users.id, users.email, users.username, users.display_name, users.preferred_locale
       FROM users
       WHERE users.status = 'active'
         AND users.email_verified_at IS NOT NULL
         AND users.last_login_at IS NOT NULL
         AND datetime(users.last_login_at) <= datetime('now', '-30 days')
         AND NOT EXISTS (
           SELECT 1 FROM email_deliveries
           WHERE email_deliveries.user_id = users.id
             AND email_deliveries.event_type = 'reengagement_30d'
             AND email_deliveries.created_at > datetime('now', '-30 days')
         )
       ORDER BY users.last_login_at ASC
       LIMIT ?`,
    )
    .bind(limit)
    .all<CampaignUser>();
  const periodKey = new Date().toISOString().slice(0, 7);
  const results = await Promise.allSettled(
    users.results.map((user) => sendReengagementEmail(env, user.email, {
      userId: user.id,
      username: user.username ?? user.display_name,
      locale: localeFor(user),
      dashboardUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me`,
      periodKey,
    })),
  );
  return {
    selected: users.results.length,
    sent: results.filter((result) => result.status === 'fulfilled' && result.value.sent).length,
    skipped: results.filter((result) => result.status === 'fulfilled' && !result.value.sent).length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}

/** Runs once a day. Bounded fan-out keeps this work comfortably inside a Worker scheduled invocation. */
export async function runEmailLifecycleCampaigns(env: Env) {
  const [day1, day3, day7, reengagement] = await Promise.all([
    sendOnboardingStage(env, 1, 60),
    sendOnboardingStage(env, 3, 60),
    sendOnboardingStage(env, 7, 60),
    sendReengagement(env, 60),
  ]);
  return { onboarding: { day1, day3, day7 }, reengagement };
}
