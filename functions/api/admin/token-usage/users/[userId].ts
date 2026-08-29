import { requireAdmin } from '../../../../_lib/auth';
import { ApiError, errorResponse, json } from '../../../../_lib/http';
import { usageByFeature, usageByProvider, usageSeries, usageSummary } from '../../../../_lib/llmUsageAdmin';

function numberValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

export const onRequestGet: PagesFunction<Env, 'userId'> = async ({ request, env, params }) => {
  try {
    await requireAdmin(env.DB, request);
    const userId = typeof params.userId === 'string' ? params.userId.trim().slice(0, 100) : '';
    if (!userId) throw new ApiError(404, 'User not found');
    const targetUser = userId === 'system'
      ? { id: 'system', display_name: 'System / automation', email: null }
      : await env.DB.prepare('SELECT id, display_name, email FROM users WHERE id = ?').bind(userId).first<{ id: string; display_name: string; email: string }>();
    if (!targetUser) throw new ApiError(404, 'User not found');
    const [summary, series, byFeatureDay, byFeatureWeek, byFeatureMonth, byProvider, recent] = await Promise.all([
      usageSummary(env.DB, userId),
      usageSeries(env.DB, userId),
      usageByFeature(env.DB, 'day', userId),
      usageByFeature(env.DB, 'week', userId),
      usageByFeature(env.DB, 'month', userId),
      usageByProvider(env.DB, userId),
      env.DB.prepare(
        `SELECT id, feature, operation, provider, model, item_type, item_id, item_label, route,
                prompt_tokens, completion_tokens, total_tokens, estimated, request_count, status, duration_ms, created_at
         FROM llm_usage_events
         WHERE ${userId === 'system' ? 'user_id IS NULL' : 'user_id = ?'}
         ORDER BY created_at DESC LIMIT 100`,
      ).bind(...(userId === 'system' ? [] : [userId])).all<Record<string, unknown>>(),
    ]);
    return json({
      user: {
        id: String(targetUser.id),
        displayName: String(targetUser.display_name),
        email: targetUser.email,
      },
      summary,
      series,
      byFeature: { day: byFeatureDay, week: byFeatureWeek, month: byFeatureMonth },
      byProvider,
      recent: recent.results.map((row) => ({
        id: String(row.id),
        feature: String(row.feature),
        operation: String(row.operation),
        provider: String(row.provider),
        model: String(row.model),
        itemType: typeof row.item_type === 'string' ? row.item_type : null,
        itemId: typeof row.item_id === 'string' ? row.item_id : null,
        itemLabel: typeof row.item_label === 'string' ? row.item_label : null,
        route: typeof row.route === 'string' ? row.route : null,
        promptTokens: numberValue(row.prompt_tokens),
        completionTokens: numberValue(row.completion_tokens),
        totalTokens: numberValue(row.total_tokens),
        estimated: Boolean(row.estimated),
        requests: numberValue(row.request_count),
        status: String(row.status),
        durationMs: row.duration_ms === null || row.duration_ms === undefined ? null : numberValue(row.duration_ms),
        createdAt: String(row.created_at),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
