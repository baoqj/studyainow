import { getAuthUser } from '../../_lib/auth';
import { errorResponse, json } from '../../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await getAuthUser(env.DB, request);

    if (!user) {
      return json({ user: null });
    }

    const subscription = await env.DB
      .prepare(
        `SELECT subscriptions.status, plans.slug, plans.name, subscriptions.current_period_end
         FROM subscriptions
         JOIN plans ON plans.id = subscriptions.plan_id
         WHERE subscriptions.user_id = ?
         ORDER BY subscriptions.created_at DESC
         LIMIT 1`,
      )
      .bind(user.id)
      .first();

    const points = await env.DB
      .prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM point_transactions WHERE user_id = ?')
      .bind(user.id)
      .first<{ balance: number }>();

    return json({
      user,
      subscription,
      points: points?.balance ?? 0,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
