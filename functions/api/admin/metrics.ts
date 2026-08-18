import { requireAdmin } from '../../_lib/auth';
import { errorResponse, json } from '../../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAdmin(env.DB, request);

    const [users, subscriptions, reads, commands, revenue] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'").first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM reading_events').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM cli_lab_commands').first<{ count: number }>(),
      env.DB
        .prepare(
          `SELECT COALESCE(SUM(plans.price_cents), 0) AS cents
           FROM subscriptions
           JOIN plans ON plans.id = subscriptions.plan_id
           WHERE subscriptions.status = 'active'`,
        )
        .first<{ cents: number }>(),
    ]);

    return json({
      users: users?.count ?? 0,
      active_subscriptions: subscriptions?.count ?? 0,
      reading_events: reads?.count ?? 0,
      cli_commands: commands?.count ?? 0,
      mrr_cents: revenue?.cents ?? 0,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
