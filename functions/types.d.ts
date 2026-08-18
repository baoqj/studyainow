/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  COURSE_STORAGE: R2Bucket;
  ASSETS: Fetcher;
  APP_ORIGIN?: string;
  CF_PAGES_BRANCH?: string;
  /** Primary production secret configured in Cloudflare Workers. */
  EMAIL_RESEND_API_KEY?: string;
  /**
   * Public, same-origin receiver path for Resend delivery webhooks. This is a
   * route, not the Resend sending API URL (which remains api.resend.com).
   */
  EMAIL_RESEND_ENDPOINT_URL?: string;
  /** Optional Svix/Resend webhook signing secret (whsec_...). */
  EMAIL_RESEND_WEBHOOK_SECRET?: string;
  /** @deprecated backwards-compatible alias for older deployments. */
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  STRIPE_RESTRICTED_KEY?: string;
  STRIPE_RESTRICTED_KEYS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRODUCT_ID?: string;
  STRIPE_PRICE_COFFEE_2?: string;
  STRIPE_PRICE_COFFEE_5?: string;
  STRIPE_PRICE_COFFEE_10?: string;
  STRIPE_COFFEE_PRICE_ID?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  // Provider-neutral configuration for the reviewed skill knowledge graph.
  // The endpoint is a full OpenAI-compatible /chat/completions URL, allowing
  // OpenAI, MegaNova, DeepSeek, GLM, Kimi, or another compatible gateway.
  SKILL_GRAPH_LLM_PROVIDER?: string;
  SKILL_GRAPH_LLM_ENDPOINT?: string;
  SKILL_GRAPH_LLM_MODEL?: string;
  SKILL_GRAPH_LLM_API_KEY?: string;
  OPENAI_API_KEY?: string;
  MEGANOVA_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  ZHIPU_API_KEY?: string;
  KIMI_API_KEY?: string;
  LLM_DEEPSEEK_API?: string;
  LLM_MEGANOVA_API?: string;
  SKILL_GRAPH_DEEPSEEK_MODEL?: string;
  SKILL_GRAPH_MEGANOVA_MODEL?: string;
  // Resume extraction uses DeepSeek first. When fewer than ten reviewable
  // facts are returned, it retries through MegaNova's GPT endpoint using
  // LLM_MEGANOVA_API and this optional model override.
  // RESUME_LLM_API_KEY takes precedence, then existing DeepSeek keys.
  RESUME_LLM_ENDPOINT?: string;
  RESUME_LLM_MODEL?: string;
  RESUME_LLM_VISION_MODEL?: string;
  RESUME_LLM_API_KEY?: string;
  RESUME_GPT_MODEL?: string;
}

interface PagesFunction<EnvType = Env, Params extends string = string> {
  (context: {
    request: Request;
    env: EnvType;
    params: Record<Params, string | undefined>;
    data: Record<string, unknown>;
    waitUntil: (promise: Promise<unknown>) => void;
    next: () => Promise<Response>;
  }): Response | Promise<Response>;
}
