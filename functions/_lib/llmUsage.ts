export type LlmUsageFeature =
  | 'resume_extract'
  | 'resume_generate'
  | 'knowledge_graph'
  | 'curriculum_localization'
  | 'job_embedding';

export type LlmUsageContext = {
  userId?: string | null;
  feature: LlmUsageFeature;
  operation?: 'chat_completion' | 'embedding';
  itemType?: string | null;
  itemId?: string | null;
  itemLabel?: string | null;
  route?: string | null;
  metadata?: Record<string, unknown>;
};

export type LlmUsageMetrics = {
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimated?: boolean;
  inputCharacters?: number;
  outputCharacters?: number;
  requestCount?: number;
  status?: 'completed' | 'failed';
  durationMs?: number | null;
};

type UsagePayload = {
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
    input_tokens?: unknown;
    output_tokens?: unknown;
  };
};

function asSafeText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : null;
}

function nonNegativeInteger(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function jsonMetadata(value: Record<string, unknown> | undefined) {
  if (!value) return '{}';
  try {
    return JSON.stringify(value).slice(0, 4_000);
  } catch {
    return '{}';
  }
}

export function estimateTokenCount(text: string) {
  if (!text) return 0;
  const cjkCharacters = text.match(/[\u3400-\u9fff\uf900-\ufaff]/gu)?.length ?? 0;
  const otherCharacters = Math.max(0, text.length - cjkCharacters);
  return Math.max(1, Math.ceil(cjkCharacters * 1.1 + otherCharacters / 4));
}

export function usageFromOpenAiPayload(payload: unknown) {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as UsagePayload : {};
  const usage = record.usage ?? {};
  const promptTokens = nonNegativeInteger(usage.prompt_tokens ?? usage.input_tokens);
  const completionTokens = nonNegativeInteger(usage.completion_tokens ?? usage.output_tokens);
  const totalTokens = nonNegativeInteger(usage.total_tokens) || promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

export async function recordLlmUsage(
  db: D1Database | undefined,
  context: LlmUsageContext,
  metrics: LlmUsageMetrics,
) {
  if (!db) return;
  const promptTokens = nonNegativeInteger(metrics.promptTokens);
  const completionTokens = nonNegativeInteger(metrics.completionTokens);
  const totalTokens = nonNegativeInteger(metrics.totalTokens) || promptTokens + completionTokens;
  try {
    await db.prepare(
      `INSERT INTO llm_usage_events
       (id, user_id, feature, operation, provider, model, item_type, item_id, item_label, route,
        prompt_tokens, completion_tokens, total_tokens, estimated, input_characters, output_characters,
        request_count, status, duration_ms, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      asSafeText(context.userId, 80),
      context.feature,
      context.operation ?? 'chat_completion',
      asSafeText(metrics.provider, 80) ?? 'unknown',
      asSafeText(metrics.model, 160) ?? 'unknown',
      asSafeText(context.itemType, 80),
      asSafeText(context.itemId, 160),
      asSafeText(context.itemLabel, 300),
      asSafeText(context.route, 220),
      totalTokens ? promptTokens : 0,
      totalTokens ? completionTokens : 0,
      totalTokens,
      metrics.estimated ? 1 : 0,
      nonNegativeInteger(metrics.inputCharacters),
      nonNegativeInteger(metrics.outputCharacters),
      Math.max(1, nonNegativeInteger(metrics.requestCount) || 1),
      metrics.status === 'failed' ? 'failed' : 'completed',
      metrics.durationMs === null || metrics.durationMs === undefined ? null : nonNegativeInteger(metrics.durationMs),
      jsonMetadata(context.metadata),
    ).run();
  } catch (error) {
    console.warn('LLM usage logging failed', error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function recordOpenAiUsage(
  db: D1Database | undefined,
  context: LlmUsageContext,
  config: { provider: string; model: string },
  payload: unknown,
  inputText: string,
  outputText: string,
  durationMs: number,
  status: 'completed' | 'failed' = 'completed',
) {
  const usage = usageFromOpenAiPayload(payload);
  const estimated = usage.totalTokens <= 0;
  const promptTokens = estimated ? estimateTokenCount(inputText) : usage.promptTokens;
  const completionTokens = estimated ? estimateTokenCount(outputText) : usage.completionTokens;
  await recordLlmUsage(db, context, {
    provider: config.provider,
    model: config.model,
    promptTokens,
    completionTokens,
    totalTokens: estimated ? promptTokens + completionTokens : usage.totalTokens,
    estimated,
    inputCharacters: inputText.length,
    outputCharacters: outputText.length,
    requestCount: 1,
    status,
    durationMs,
  });
}
