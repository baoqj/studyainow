import { Hono, type Context } from 'hono';
import {
  authorizeAdminRequest,
  type AdminIdentity,
} from './admin/auth';
import {
  objectBody,
  optionalBoolean,
  optionalString,
  pageLimit,
  positiveInteger,
  requiredString,
  stringArray,
} from './admin/validation';
import type { Env } from './env';
import {
  createArticle,
  editorialDashboard,
  getArticle,
  listArticles,
  performArticleAction,
  updateArticle,
  type ArticleAction,
  type ArticleInput,
} from './editorial/service';
import { listCandidates, processCandidateBatch, updateStoryMetadata } from './enrichment/service';
import {
  createSource,
  listSourceHealth,
  probeSourceRequest,
  retireSource,
  runManualIngestion,
  updateSource,
} from './ingestion/admin';
import { inspectNewsSchema } from './schema-health';
import { createTag, listTaxonomy, mergeTag, updateTaxonomyNode } from './taxonomy/service';
import { resolveTraceId } from './trace';
import {
  addClaimEvidence,
  createClaim,
  generateResearchPackage,
  getStoryResearch,
  updateClaim,
  type ClaimImportance,
  type ClaimRisk,
  type ClaimSupport,
  type ClaimType,
} from './research/service';
import {
  generateLearningLinks,
  getStoryLearningLinks,
  listLearningLinks,
  reviewLearningLink,
} from './learning/service';
import { getPublicArticle, listPublicArticles, publicHome } from './public/service';

export const API_VERSION = '0.6.0';

type Bindings = {
  Bindings: Env;
  Variables: {
    traceId: string;
    adminIdentity: AdminIdentity;
  };
};

export const app = new Hono<Bindings>();

function validIdempotencyKey(value: string | undefined): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 120 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function parseArticleInput(body: Record<string, unknown>, update = false): ArticleInput {
  const articleType = body.articleType ?? (update ? 'brief' : undefined);
  if (!['brief', 'deep_dive', 'daily', 'podcast_notes'].includes(String(articleType))) {
    throw new Error('invalid_article_type');
  }
  const accessLevel = body.accessLevel ?? 'free';
  if (!['free', 'member', 'vip', 'internal'].includes(String(accessLevel))) {
    throw new Error('invalid_access_level');
  }
  return {
    storyId: optionalString(body.storyId, 'story_id', 120),
    articleType: articleType as ArticleInput['articleType'],
    accessLevel: accessLevel as ArticleInput['accessLevel'],
    locale: optionalString(body.locale, 'locale', 35) ?? 'zh-CN',
    slug: requiredString(body.slug, 'slug', 160),
    title: requiredString(body.title, 'title', 500),
    summary: requiredString(body.summary, 'summary', 2000),
    bodyMarkdown: requiredString(body.bodyMarkdown, 'body_markdown', 100_000),
    categoryId: requiredString(body.categoryId, 'category_id', 120),
    tagIds: stringArray(body.tagIds ?? [], 'tag_ids', 10),
    claimIds: stringArray(body.claimIds ?? [], 'claim_ids', 100),
    changeReason: requiredString(body.changeReason, 'change_reason', 1000),
  };
}

function parseClaimInput(body: Record<string, unknown>) {
  const claimType = requiredString(body.claimType, 'claim_type', 30) as ClaimType;
  const supportStatus = requiredString(body.supportStatus, 'support_status', 30) as ClaimSupport;
  const riskLevel = requiredString(body.riskLevel, 'risk_level', 20) as ClaimRisk;
  const importance = requiredString(body.importance, 'importance', 20) as ClaimImportance;
  if (!['fact', 'number', 'quote', 'prediction', 'editorial_opinion', 'inference'].includes(claimType)) throw new Error('invalid_claim_type');
  if (!['supported', 'conflicted', 'unverified', 'rejected'].includes(supportStatus)) throw new Error('invalid_support_status');
  if (!['normal', 'high'].includes(riskLevel)) throw new Error('invalid_risk_level');
  if (!['critical', 'standard'].includes(importance)) throw new Error('invalid_importance');
  return {
    claimText: requiredString(body.claimText, 'claim_text', 2_000),
    claimType,
    supportStatus,
    riskLevel,
    importance,
    reason: requiredString(body.reason, 'reason', 1_000),
  };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^[a-z0-9_:-]{3,120}$/.test(message) ? message : 'request_could_not_be_completed';
}

function invalidRequest(context: Context<Bindings>, error: unknown, code: string) {
  return context.json({
    ok: false as const,
    error: { code, message: safeErrorMessage(error) },
    traceId: context.get('traceId'),
  }, 400);
}

function notFound(context: Context<Bindings>, code: string, message: string) {
  return context.json({
    ok: false as const,
    error: { code, message },
    traceId: context.get('traceId'),
  }, 404);
}

function requireTrustedCoreCatalog(context: Context<Bindings>) {
  if (context.get('adminIdentity').method === 'service') return null;
  return context.json({
    ok: false as const,
    error: { code: 'trusted_core_catalog_required', message: 'Learning mutations must pass through the authenticated StudyAINow admin proxy' },
    traceId: context.get('traceId'),
  }, 403);
}

app.use('*', async (context, next) => {
  const traceId = resolveTraceId(context.req.raw);
  context.set('traceId', traceId);

  await next();

  context.header('x-request-id', traceId);
  context.header('x-content-type-options', 'nosniff');
  context.header('referrer-policy', 'no-referrer');
});

app.get('/api/news/v1/health', async (context) => {
  const database = await inspectNewsSchema(context.env.DB);
  const baseResponse = {
    service: 'studyai-news-api' as const,
    version: API_VERSION,
    release: context.env.RELEASE_VERSION,
    environment: context.env.ENVIRONMENT,
    database,
    traceId: context.get('traceId'),
  };

  if (!database.ok) {
    return context.json({
      ok: false as const,
      ...baseResponse,
      error: {
        code: 'schema_unavailable' as const,
        message: 'News database schema is unavailable or outdated',
      },
    }, 503, {
      'cache-control': 'no-store',
    });
  }

  return context.json({
    ok: true as const,
    ...baseResponse,
  }, 200, {
    'cache-control': 'no-store',
  });
});

app.get('/api/news/v1/home', async (context) => context.json({
  ok: true as const,
  ...(await publicHome(context.env.DB)),
  traceId: context.get('traceId'),
}, 200, {
  'cache-control': 'public, max-age=120, stale-while-revalidate=600',
}));

app.get('/api/news/v1/articles', async (context) => {
  try {
    const articles = await listPublicArticles(context.env.DB, {
      limit: pageLimit(context.req.query('limit')),
      category: optionalString(context.req.query('category'), 'category', 160),
      tag: optionalString(context.req.query('tag'), 'tag', 160),
    });
    return context.json({ ok: true as const, articles, traceId: context.get('traceId') }, 200, {
      'cache-control': 'public, max-age=120, stale-while-revalidate=600',
    });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_public_article_query');
  }
});

app.get('/api/news/v1/articles/:slug', async (context) => {
  const article = await getPublicArticle(context.env.DB, context.req.param('slug'));
  if (!article) return notFound(context, 'article_not_found', 'Published article not found');
  return context.json({ ok: true as const, article, traceId: context.get('traceId') }, 200, {
    'cache-control': 'public, max-age=120, stale-while-revalidate=600',
  });
});

app.use('/api/admin/news/*', async (context, next) => {
  context.header('cache-control', 'no-store');
  const identity = await authorizeAdminRequest(context.req.raw, context.env);
  if (!identity) {
    context.header('www-authenticate', 'Bearer realm="studyai-news-admin"');
    return context.json({
      ok: false as const,
      error: {
        code: 'unauthorized' as const,
        message: 'A valid StudyAINow administrator identity is required',
      },
      traceId: context.get('traceId'),
    }, 401);
  }
  context.set('adminIdentity', identity);
  await next();
});

app.get('/api/admin/news/dashboard', async (context) => context.json({
  ok: true as const,
  counts: await editorialDashboard(context.env.DB),
  traceId: context.get('traceId'),
}));

app.get('/api/admin/news/candidates', async (context) => {
  try {
    return context.json({
      ok: true as const,
      candidates: await listCandidates(context.env.DB, pageLimit(context.req.query('limit'))),
      traceId: context.get('traceId'),
    });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_candidate_query');
  }
});

app.post('/api/admin/news/candidates/enrich', async (context) => {
  if (!validIdempotencyKey(context.req.header('idempotency-key'))) {
    return invalidRequest(context, new Error('idempotency_key_required'), 'idempotency_key_required');
  }
  try {
    const body = objectBody(await context.req.json());
    const limit = body.limit === undefined ? 60 : positiveInteger(body.limit, 'limit', 100);
    return context.json({
      ok: true as const,
      result: await processCandidateBatch(context.env, limit),
      traceId: context.get('traceId'),
    });
  } catch (error) {
    return invalidRequest(context, error, 'candidate_enrichment_failed');
  }
});

app.patch('/api/admin/news/candidates/:storyId', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const updated = await updateStoryMetadata(
      context.env.DB,
      context.req.param('storyId'),
      {
        categoryId: requiredString(body.categoryId, 'category_id', 120),
        tagIds: stringArray(body.tagIds, 'tag_ids', 10),
        locked: optionalBoolean(body.locked, 'locked') ?? true,
        reason: requiredString(body.reason, 'reason', 1000),
      },
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    if (!updated) return notFound(context, 'story_not_found', 'Story candidate not found');
    return context.json({ ok: true as const, traceId: context.get('traceId') });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_story_update');
  }
});

app.get('/api/admin/news/stories/:storyId', async (context) => {
  const research = await getStoryResearch(context.env.DB, context.req.param('storyId'));
  if (!research) return notFound(context, 'story_not_found', 'Story candidate not found');
  const learningLinks = await getStoryLearningLinks(context.env.DB, context.req.param('storyId'));
  return context.json({ ok: true as const, ...research, learningLinks, traceId: context.get('traceId') });
});

app.post('/api/admin/news/stories/:storyId/research', async (context) => {
  const idempotencyKey = context.req.header('idempotency-key');
  if (!validIdempotencyKey(idempotencyKey)) {
    return invalidRequest(context, new Error('idempotency_key_required'), 'idempotency_key_required');
  }
  try {
    const result = await generateResearchPackage(
      context.env.DB,
      context.req.param('storyId'),
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
      idempotencyKey,
    );
    return context.json({ ok: true as const, result, traceId: context.get('traceId') });
  } catch (error) {
    if (error instanceof Error && error.message === 'story_not_found') {
      return notFound(context, 'story_not_found', 'Story candidate not found');
    }
    return invalidRequest(context, error, 'research_generation_failed');
  }
});

app.post('/api/admin/news/stories/:storyId/claims', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const claimId = await createClaim(
      context.env.DB,
      context.req.param('storyId'),
      parseClaimInput(body),
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    return context.json({ ok: true as const, claimId, traceId: context.get('traceId') }, 201);
  } catch (error) {
    return invalidRequest(context, error, 'invalid_claim');
  }
});

app.post('/api/admin/news/stories/:storyId/learning-links', async (context) => {
  const forbidden = requireTrustedCoreCatalog(context);
  if (forbidden) return forbidden;
  const idempotencyKey = context.req.header('idempotency-key');
  if (!validIdempotencyKey(idempotencyKey)) {
    return invalidRequest(context, new Error('idempotency_key_required'), 'idempotency_key_required');
  }
  try {
    const body = objectBody(await context.req.json());
    const result = await generateLearningLinks(
      context.env,
      context.req.param('storyId'),
      body.catalog,
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    return context.json({ ok: true as const, result, traceId: context.get('traceId') });
  } catch (error) {
    if (error instanceof Error && error.message === 'story_not_found') {
      return notFound(context, 'story_not_found', 'Story candidate not found');
    }
    return invalidRequest(context, error, 'learning_link_generation_failed');
  }
});

app.get('/api/admin/news/learning-links', async (context) => {
  try {
    const status = optionalString(context.req.query('status'), 'status', 30);
    return context.json({
      ok: true as const,
      learningLinks: await listLearningLinks(context.env.DB, status, pageLimit(context.req.query('limit'))),
      traceId: context.get('traceId'),
    });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_learning_link_query');
  }
});

app.patch('/api/admin/news/learning-links/:linkId', async (context) => {
  const forbidden = requireTrustedCoreCatalog(context);
  if (forbidden) return forbidden;
  try {
    const body = objectBody(await context.req.json());
    const status = requiredString(body.status, 'status', 30);
    if (!['approved', 'rejected', 'withdrawn'].includes(status)) throw new Error('invalid_learning_review_status');
    const result = await reviewLearningLink(
      context.env.DB,
      context.req.param('linkId'),
      {
        status: status as 'approved' | 'rejected' | 'withdrawn',
        expectedUpdatedAt: requiredString(body.expectedUpdatedAt, 'expected_updated_at', 80),
        reason: requiredString(body.reason, 'reason', 1000),
        catalog: body.catalog,
      },
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    if (result === 'not_found') return notFound(context, 'learning_link_not_found', 'Learning link not found');
    if (result === 'conflict') return context.json({
      ok: false as const,
      error: { code: 'edit_conflict', message: 'Learning link changed; reload before reviewing' },
      traceId: context.get('traceId'),
    }, 409);
    return context.json({ ok: true as const, status: result, traceId: context.get('traceId') });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_learning_link_review');
  }
});

app.patch('/api/admin/news/claims/:claimId', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const updated = await updateClaim(
      context.env.DB,
      context.req.param('claimId'),
      parseClaimInput(body),
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    if (!updated) return notFound(context, 'claim_not_found', 'Claim not found');
    return context.json({ ok: true as const, traceId: context.get('traceId') });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_claim_update');
  }
});

app.post('/api/admin/news/claims/:claimId/evidence', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const evidenceId = await addClaimEvidence(
      context.env.DB,
      context.req.param('claimId'),
      {
        itemId: requiredString(body.itemId, 'item_id', 120),
        evidenceExcerpt: requiredString(body.evidenceExcerpt, 'evidence_excerpt', 2_000),
        isPrimary: optionalBoolean(body.isPrimary, 'is_primary') ?? false,
      },
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    return context.json({ ok: true as const, evidenceId, traceId: context.get('traceId') }, 201);
  } catch (error) {
    return invalidRequest(context, error, 'invalid_claim_evidence');
  }
});

app.get('/api/admin/news/articles', async (context) => {
  try {
    const status = optionalString(context.req.query('status'), 'status', 30);
    return context.json({
      ok: true as const,
      articles: await listArticles(context.env.DB, status, pageLimit(context.req.query('limit'))),
      traceId: context.get('traceId'),
    });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_article_query');
  }
});

app.post('/api/admin/news/articles', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const articleId = await createArticle(
      context.env.DB,
      parseArticleInput(body),
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    return context.json({ ok: true as const, articleId, traceId: context.get('traceId') }, 201);
  } catch (error) {
    return invalidRequest(context, error, 'invalid_article');
  }
});

app.get('/api/admin/news/articles/:articleId', async (context) => {
  const article = await getArticle(context.env.DB, context.req.param('articleId'));
  if (!article) return notFound(context, 'article_not_found', 'Article not found');
  return context.json({ ok: true as const, article, traceId: context.get('traceId') });
});

app.patch('/api/admin/news/articles/:articleId', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const input = parseArticleInput(body, true);
    const result = await updateArticle(
      context.env.DB,
      context.req.param('articleId'),
      { ...input, expectedVersion: positiveInteger(body.expectedVersion, 'expected_version') },
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    if (result.status === 'not_found') return notFound(context, 'article_not_found', 'Article not found');
    if (result.status === 'conflict') {
      return context.json({
        ok: false as const,
        error: { code: 'version_conflict' as const, message: 'Article changed in another session' },
        traceId: context.get('traceId'),
      }, 409);
    }
    return context.json({ ok: true as const, ...result, traceId: context.get('traceId') });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_article_update');
  }
});

app.post('/api/admin/news/articles/:articleId/actions/:action', async (context) => {
  const action = context.req.param('action') as ArticleAction;
  if (!['submit', 'return', 'reject', 'approve', 'schedule', 'publish', 'correct', 'withdraw', 'reopen'].includes(action)) {
    return notFound(context, 'action_not_found', 'Article action not found');
  }
  const idempotencyKey = context.req.header('idempotency-key');
  if (!validIdempotencyKey(idempotencyKey)) {
    return invalidRequest(context, new Error('idempotency_key_required'), 'idempotency_key_required');
  }
  try {
    const body = objectBody(await context.req.json());
    const result = await performArticleAction(
      context.env.DB,
      context.req.param('articleId'),
      action,
      {
        reason: requiredString(body.reason, 'reason', 1000),
        scheduledAt: optionalString(body.scheduledAt, 'scheduled_at', 50),
      },
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
      idempotencyKey!,
    );
    if (result.status === 'not_found') return notFound(context, 'article_not_found', 'Article not found');
    return context.json({ ok: true as const, ...result, traceId: context.get('traceId') });
  } catch (error) {
    return invalidRequest(context, error, 'article_action_failed');
  }
});

app.get('/api/admin/news/taxonomy', async (context) => context.json({
  ok: true as const,
  taxonomy: await listTaxonomy(context.env.DB),
  traceId: context.get('traceId'),
}));

app.post('/api/admin/news/taxonomy/tags', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const taxonomyId = await createTag(
      context.env.DB,
      {
        name: requiredString(body.name, 'name', 120),
        slug: optionalString(body.slug, 'slug', 80),
        aliases: stringArray(body.aliases ?? [], 'aliases', 20),
      },
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    return context.json({ ok: true as const, taxonomyId, traceId: context.get('traceId') }, 201);
  } catch (error) {
    return invalidRequest(context, error, 'invalid_tag');
  }
});

app.patch('/api/admin/news/taxonomy/:taxonomyId', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const status = optionalString(body.status, 'status', 20);
    if (status && status !== 'active' && status !== 'retired') throw new Error('invalid_status');
    const updated = await updateTaxonomyNode(
      context.env.DB,
      context.req.param('taxonomyId'),
      {
        name: requiredString(body.name, 'name', 120),
        aliases: stringArray(body.aliases ?? [], 'aliases', 20),
        status: (status as 'active' | 'retired' | null) ?? undefined,
      },
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    if (!updated) return notFound(context, 'taxonomy_not_found', 'Taxonomy node not found');
    return context.json({ ok: true as const, traceId: context.get('traceId') });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_taxonomy_update');
  }
});

app.post('/api/admin/news/taxonomy/:taxonomyId/merge', async (context) => {
  try {
    const body = objectBody(await context.req.json());
    const merged = await mergeTag(
      context.env.DB,
      context.req.param('taxonomyId'),
      requiredString(body.canonicalId, 'canonical_id', 120),
      context.get('adminIdentity').actorRef,
      context.get('traceId'),
    );
    if (!merged) return notFound(context, 'taxonomy_not_found', 'Tag not found');
    return context.json({ ok: true as const, traceId: context.get('traceId') });
  } catch (error) {
    return invalidRequest(context, error, 'invalid_tag_merge');
  }
});

app.get('/api/admin/news/sources', async (context) => {
  return context.json({
    ok: true as const,
    sources: await listSourceHealth(context.env.DB),
    traceId: context.get('traceId'),
  });
});

app.post('/api/admin/news/sources/probe', async (context) => {
  try {
    return context.json({
      ok: true as const,
      probe: await probeSourceRequest(context.req.raw),
      traceId: context.get('traceId'),
    });
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'source_probe_failed' as const,
        message: error instanceof Error ? error.message : 'Source probe failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
});

app.post('/api/admin/news/sources', async (context) => {
  try {
    const sourceId = await createSource(
      context.env,
      context.req.raw,
      context.get('traceId'),
      context.get('adminIdentity').actorRef,
    );
    return context.json({
      ok: true as const,
      sourceId,
      status: 'paused' as const,
      policyStatus: 'review_required' as const,
      traceId: context.get('traceId'),
    }, 201);
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'invalid_source' as const,
        message: error instanceof Error ? error.message : 'Source creation failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
});

app.patch('/api/admin/news/sources/:sourceId', async (context) => {
  try {
    const updated = await updateSource(
      context.env,
      context.req.param('sourceId'),
      context.req.raw,
      context.get('traceId'),
      context.get('adminIdentity').actorRef,
    );
    if (!updated) {
      return context.json({
        ok: false as const,
        error: { code: 'source_not_found' as const, message: 'Source not found' },
        traceId: context.get('traceId'),
      }, 404);
    }
    return context.json({ ok: true as const, traceId: context.get('traceId') });
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'invalid_source_update' as const,
        message: error instanceof Error ? error.message : 'Source update failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
});

app.delete('/api/admin/news/sources/:sourceId', async (context) => {
  const updated = await retireSource(
    context.env,
    context.req.param('sourceId'),
    context.get('traceId'),
    context.get('adminIdentity').actorRef,
  );
  if (!updated) {
    return context.json({
      ok: false as const,
      error: { code: 'source_not_found' as const, message: 'Source not found' },
      traceId: context.get('traceId'),
    }, 404);
  }
  return context.json({ ok: true as const, status: 'retired' as const, traceId: context.get('traceId') });
});

app.post('/api/admin/news/sources/:sourceId/run', async (context) => {
  const idempotencyKey = context.req.header('idempotency-key');
  if (!idempotencyKey) {
    return context.json({
      ok: false as const,
      error: { code: 'idempotency_key_required' as const, message: 'Idempotency-Key is required' },
      traceId: context.get('traceId'),
    }, 400);
  }

  try {
    const result = await runManualIngestion(
      context.env,
      context.req.param('sourceId'),
      idempotencyKey,
    );
    if (!result) {
      return context.json({
        ok: false as const,
        error: { code: 'source_not_found' as const, message: 'Source not found or not approved' },
        traceId: context.get('traceId'),
      }, 404);
    }
    const enrichment = result.status === 'succeeded'
      ? await processCandidateBatch(context.env, 60)
      : null;
    return context.json({
      ok: result.status !== 'failed',
      result,
      enrichment,
      traceId: context.get('traceId'),
    }, result.status === 'failed' ? 502 : 200);
  } catch (error) {
    return context.json({
      ok: false as const,
      error: {
        code: 'ingestion_request_failed' as const,
        message: error instanceof Error ? error.message : 'Ingestion request failed',
      },
      traceId: context.get('traceId'),
    }, 400);
  }
});

app.all('/api/news/v1/health', (context) => {
  context.header('allow', 'GET');
  return context.json({
    ok: false as const,
    error: {
      code: 'method_not_allowed' as const,
      message: 'Method not allowed',
    },
    traceId: context.get('traceId'),
  }, 405);
});

app.notFound((context) => {
  return context.json({
    ok: false as const,
    error: {
      code: 'not_found' as const,
      message: 'Route not found',
    },
    traceId: context.get('traceId'),
  }, 404);
});

app.onError((error, context) => {
  console.error('Unhandled API error', {
    traceId: context.get('traceId'),
    name: error.name,
  });

  return context.json({
    ok: false as const,
    error: {
      code: 'internal_error' as const,
      message: 'Internal server error',
    },
    traceId: context.get('traceId'),
  }, 500);
});
