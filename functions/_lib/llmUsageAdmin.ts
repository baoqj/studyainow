export type UsagePeriod = 'day' | 'week' | 'month';

type RawBucket = {
  bucket: string;
  total_tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  requests: number | null;
  estimated_tokens: number | null;
  failed_requests: number | null;
};

export type UsageBucket = {
  bucket: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  estimatedTokens: number;
  failedRequests: number;
};

function toNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isoMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

function isoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function periodKeys(period: UsagePeriod) {
  const now = new Date();
  if (period === 'day') {
    return Array.from({ length: 30 }, (_unused, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (29 - index)));
      return isoDay(date);
    });
  }
  if (period === 'week') {
    return Array.from({ length: 12 }, (_unused, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (11 - index) * 7));
      return isoWeek(date);
    });
  }
  return Array.from({ length: 12 }, (_unused, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1));
    return isoMonth(date);
  });
}

function normalizeRows(rows: RawBucket[], period: UsagePeriod): UsageBucket[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  return periodKeys(period).map((bucket) => {
    const row = byBucket.get(bucket);
    return {
      bucket,
      totalTokens: Math.round(toNumber(row?.total_tokens)),
      promptTokens: Math.round(toNumber(row?.prompt_tokens)),
      completionTokens: Math.round(toNumber(row?.completion_tokens)),
      requests: Math.round(toNumber(row?.requests)),
      estimatedTokens: Math.round(toNumber(row?.estimated_tokens)),
      failedRequests: Math.round(toNumber(row?.failed_requests)),
    };
  });
}

function conditionClause(userId?: string | null) {
  if (!userId) return { sql: '', bindings: [] as unknown[] };
  if (userId === 'system') return { sql: ' AND user_id IS NULL', bindings: [] as unknown[] };
  return { sql: ' AND user_id = ?', bindings: [userId] as unknown[] };
}

export async function usageSeries(db: D1Database, userId?: string | null) {
  const condition = conditionClause(userId);
  const [days, weeks, months] = await Promise.all([
    db.prepare(
      `SELECT date(created_at) AS bucket,
              SUM(total_tokens) AS total_tokens,
              SUM(prompt_tokens) AS prompt_tokens,
              SUM(completion_tokens) AS completion_tokens,
              SUM(request_count) AS requests,
              SUM(CASE WHEN estimated = 1 THEN total_tokens ELSE 0 END) AS estimated_tokens,
              SUM(CASE WHEN status = 'failed' THEN request_count ELSE 0 END) AS failed_requests
       FROM llm_usage_events
       WHERE created_at >= datetime('now', '-29 days')${condition.sql}
       GROUP BY bucket ORDER BY bucket`,
    ).bind(...condition.bindings).all<RawBucket>(),
    db.prepare(
      `SELECT strftime('%Y-W%W', created_at) AS bucket,
              SUM(total_tokens) AS total_tokens,
              SUM(prompt_tokens) AS prompt_tokens,
              SUM(completion_tokens) AS completion_tokens,
              SUM(request_count) AS requests,
              SUM(CASE WHEN estimated = 1 THEN total_tokens ELSE 0 END) AS estimated_tokens,
              SUM(CASE WHEN status = 'failed' THEN request_count ELSE 0 END) AS failed_requests
       FROM llm_usage_events
       WHERE created_at >= datetime('now', '-83 days')${condition.sql}
       GROUP BY bucket ORDER BY bucket`,
    ).bind(...condition.bindings).all<RawBucket>(),
    db.prepare(
      `SELECT strftime('%Y-%m', created_at) AS bucket,
              SUM(total_tokens) AS total_tokens,
              SUM(prompt_tokens) AS prompt_tokens,
              SUM(completion_tokens) AS completion_tokens,
              SUM(request_count) AS requests,
              SUM(CASE WHEN estimated = 1 THEN total_tokens ELSE 0 END) AS estimated_tokens,
              SUM(CASE WHEN status = 'failed' THEN request_count ELSE 0 END) AS failed_requests
       FROM llm_usage_events
       WHERE created_at >= datetime('now', '-11 months')${condition.sql}
       GROUP BY bucket ORDER BY bucket`,
    ).bind(...condition.bindings).all<RawBucket>(),
  ]);
  return {
    day: normalizeRows(days.results, 'day'),
    week: normalizeRows(weeks.results, 'week'),
    month: normalizeRows(months.results, 'month'),
  };
}

export async function usageSummary(db: D1Database, userId?: string | null) {
  const condition = conditionClause(userId);
  const row = await db.prepare(
    `SELECT SUM(total_tokens) AS total_tokens,
            SUM(prompt_tokens) AS prompt_tokens,
            SUM(completion_tokens) AS completion_tokens,
            SUM(request_count) AS requests,
            COUNT(DISTINCT user_id) AS users,
            SUM(CASE WHEN estimated = 1 THEN total_tokens ELSE 0 END) AS estimated_tokens,
            SUM(CASE WHEN status = 'failed' THEN request_count ELSE 0 END) AS failed_requests
     FROM llm_usage_events
     WHERE created_at >= datetime('now', '-30 days')${condition.sql}`,
  ).bind(...condition.bindings).first<Record<string, unknown>>();
  return {
    totalTokens: Math.round(toNumber(row?.total_tokens)),
    promptTokens: Math.round(toNumber(row?.prompt_tokens)),
    completionTokens: Math.round(toNumber(row?.completion_tokens)),
    requests: Math.round(toNumber(row?.requests)),
    users: Math.round(toNumber(row?.users)),
    estimatedTokens: Math.round(toNumber(row?.estimated_tokens)),
    failedRequests: Math.round(toNumber(row?.failed_requests)),
  };
}

export async function usageByFeature(db: D1Database, period: UsagePeriod, userId?: string | null) {
  const condition = conditionClause(userId);
  const window = period === 'day' ? '-29 days' : period === 'week' ? '-83 days' : '-11 months';
  const bucket = period === 'day' ? 'date(created_at)' : period === 'week' ? "strftime('%Y-W%W', created_at)" : "strftime('%Y-%m', created_at)";
  const rows = await db.prepare(
    `SELECT ${bucket} AS bucket, feature,
            SUM(total_tokens) AS total_tokens,
            SUM(prompt_tokens) AS prompt_tokens,
            SUM(completion_tokens) AS completion_tokens,
            SUM(request_count) AS requests,
            SUM(CASE WHEN estimated = 1 THEN total_tokens ELSE 0 END) AS estimated_tokens,
            SUM(CASE WHEN status = 'failed' THEN request_count ELSE 0 END) AS failed_requests
     FROM llm_usage_events
     WHERE created_at >= datetime('now', ?)${condition.sql}
     GROUP BY bucket, feature ORDER BY bucket DESC, total_tokens DESC`,
  ).bind(window, ...condition.bindings).all<Record<string, unknown>>();
  return rows.results.map((row) => ({
    bucket: String(row.bucket ?? ''),
    feature: String(row.feature ?? ''),
    totalTokens: Math.round(toNumber(row.total_tokens)),
    promptTokens: Math.round(toNumber(row.prompt_tokens)),
    completionTokens: Math.round(toNumber(row.completion_tokens)),
    requests: Math.round(toNumber(row.requests)),
    estimatedTokens: Math.round(toNumber(row.estimated_tokens)),
    failedRequests: Math.round(toNumber(row.failed_requests)),
  }));
}

export async function usageByProvider(db: D1Database, userId?: string | null) {
  const condition = conditionClause(userId);
  const rows = await db.prepare(
    `SELECT provider, model,
            SUM(total_tokens) AS total_tokens,
            SUM(request_count) AS requests,
            SUM(CASE WHEN estimated = 1 THEN total_tokens ELSE 0 END) AS estimated_tokens
     FROM llm_usage_events
     WHERE created_at >= datetime('now', '-30 days')${condition.sql}
     GROUP BY provider, model ORDER BY total_tokens DESC LIMIT 40`,
  ).bind(...condition.bindings).all<Record<string, unknown>>();
  return rows.results.map((row) => ({
    provider: String(row.provider ?? ''),
    model: String(row.model ?? ''),
    totalTokens: Math.round(toNumber(row.total_tokens)),
    requests: Math.round(toNumber(row.requests)),
    estimatedTokens: Math.round(toNumber(row.estimated_tokens)),
  }));
}
