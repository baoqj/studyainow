import { requireAdmin } from '../../../_lib/auth';
import { errorResponse, json } from '../../../_lib/http';
import { usageByFeature, usageByProvider, usageSeries, usageSummary } from '../../../_lib/llmUsageAdmin';

function numberValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAdmin(env.DB, request);
    const url = new URL(request.url);
    const period = url.searchParams.get('period') === 'week' ? 'week' : url.searchParams.get('period') === 'month' ? 'month' : 'day';
    const [summary, series, byFeature, byProvider, users] = await Promise.all([
      usageSummary(env.DB),
      usageSeries(env.DB),
      usageByFeature(env.DB, period),
      usageByProvider(env.DB),
      env.DB.prepare(
        `SELECT COALESCE(llm_usage_events.user_id, 'system') AS user_id,
                COALESCE(users.display_name, 'System / automation') AS display_name,
                users.email,
                SUM(llm_usage_events.total_tokens) AS total_tokens,
                SUM(llm_usage_events.prompt_tokens) AS prompt_tokens,
                SUM(llm_usage_events.completion_tokens) AS completion_tokens,
                SUM(llm_usage_events.request_count) AS requests,
                SUM(CASE WHEN llm_usage_events.estimated = 1 THEN llm_usage_events.total_tokens ELSE 0 END) AS estimated_tokens,
                MAX(llm_usage_events.created_at) AS last_used_at
         FROM llm_usage_events
         LEFT JOIN users ON users.id = llm_usage_events.user_id
         WHERE llm_usage_events.created_at >= datetime('now', '-30 days')
         GROUP BY COALESCE(llm_usage_events.user_id, 'system')
         ORDER BY total_tokens DESC LIMIT 100`,
      ).all<Record<string, unknown>>(),
    ]);
    return json({
      period,
      summary,
      series,
      byFeature,
      byProvider,
      users: users.results.map((row) => ({
        userId: String(row.user_id ?? 'system'),
        displayName: String(row.display_name ?? 'System / automation'),
        email: typeof row.email === 'string' ? row.email : null,
        totalTokens: numberValue(row.total_tokens),
        promptTokens: numberValue(row.prompt_tokens),
        completionTokens: numberValue(row.completion_tokens),
        requests: numberValue(row.requests),
        estimatedTokens: numberValue(row.estimated_tokens),
        lastUsedAt: String(row.last_used_at ?? ''),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
