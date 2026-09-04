import { canTransitionArticle, type ArticleStatus } from '../domain/article-status';

export type ArticleAction = 'submit' | 'return' | 'reject' | 'approve' | 'schedule' | 'publish' | 'correct' | 'withdraw' | 'reopen';

interface ArticleRow {
  id: string;
  story_id: string | null;
  article_type: string;
  status: ArticleStatus;
  access_level: string;
  primary_locale: string;
  active_revision_id: string | null;
  published_revision_id: string | null;
  version: number;
  scheduled_at: string | null;
  published_at: string | null;
  corrected_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleInput {
  storyId?: string | null;
  articleType: 'brief' | 'deep_dive' | 'daily' | 'podcast_notes';
  accessLevel: 'free' | 'member' | 'vip' | 'internal';
  locale: string;
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  categoryId: string;
  tagIds: string[];
  changeReason: string;
}

export interface ArticleUpdateInput extends Omit<ArticleInput, 'storyId' | 'articleType'> {
  expectedVersion: number;
}

export interface ArticleSummary {
  id: string;
  status: ArticleStatus;
  articleType: string;
  accessLevel: string;
  version: number;
  title: string;
  summary: string;
  updatedAt: string;
  publishedAt: string | null;
  category: { id: string; name: string } | null;
  tags: Array<{ id: string; name: string }>;
}

function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) throw new Error('invalid_slug');
}

async function validateTaxonomy(db: D1Database, categoryId: string, tagIds: string[]): Promise<void> {
  const category = await db.prepare(`
    SELECT id FROM taxonomy_node
    WHERE id = ? AND taxonomy_type = 'category' AND status = 'active'
  `).bind(categoryId).first<{ id: string }>();
  if (!category) throw new Error('invalid_category_id');
  for (const tagId of tagIds) {
    const tag = await db.prepare(`
      SELECT id FROM taxonomy_node WHERE id = ? AND taxonomy_type = 'tag' AND status = 'active'
    `).bind(tagId).first<{ id: string }>();
    if (!tag) throw new Error('invalid_tag_id');
  }
}

function taxonomyStatements(
  db: D1Database,
  articleId: string,
  categoryId: string,
  tagIds: string[],
): D1PreparedStatement[] {
  return [
    db.prepare('DELETE FROM article_taxonomy WHERE article_id = ?').bind(articleId),
    db.prepare(`
      INSERT INTO article_taxonomy (
        article_id, taxonomy_id, relation_type, confidence, locked, source_version
      ) VALUES (?, ?, 'primary', 1, 1, 'human')
    `).bind(articleId, categoryId),
    ...tagIds.map((tagId) => db.prepare(`
      INSERT INTO article_taxonomy (
        article_id, taxonomy_id, relation_type, confidence, locked, source_version
      ) VALUES (?, ?, 'mentioned', 1, 1, 'human')
    `).bind(articleId, tagId)),
  ];
}

async function getArticleRow(db: D1Database, articleId: string): Promise<ArticleRow | null> {
  return db.prepare(`
    SELECT id, story_id, article_type, status, access_level, primary_locale,
      active_revision_id, published_revision_id, version, scheduled_at, published_at,
      corrected_at, withdrawn_at, created_at, updated_at
    FROM article WHERE id = ? AND deleted_at IS NULL LIMIT 1
  `).bind(articleId).first<ArticleRow>();
}

export async function createArticle(
  db: D1Database,
  input: ArticleInput,
  actorRef: string,
  traceId: string,
): Promise<string> {
  validateSlug(input.slug);
  await validateTaxonomy(db, input.categoryId, input.tagIds);
  if (input.storyId) {
    const story = await db.prepare('SELECT id FROM story_cluster WHERE id = ? LIMIT 1')
      .bind(input.storyId)
      .first<{ id: string }>();
    if (!story) throw new Error('story_not_found');
    const existing = await db.prepare(`
      SELECT id FROM article WHERE story_id = ? AND deleted_at IS NULL LIMIT 1
    `).bind(input.storyId).first<{ id: string }>();
    if (existing) throw new Error('story_article_exists');
  }

  const articleId = `article_${crypto.randomUUID()}`;
  const revisionId = `revision_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`
      INSERT INTO article (
        id, story_id, article_type, status, access_level, primary_locale, version
      ) VALUES (?, ?, ?, 'draft', ?, ?, 1)
    `).bind(articleId, input.storyId ?? null, input.articleType, input.accessLevel, input.locale),
    db.prepare(`
      INSERT INTO article_revision (
        id, article_id, revision_number, locale, slug, title, summary, body_markdown,
        change_reason, editor_ref
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      revisionId,
      articleId,
      input.locale,
      input.slug,
      input.title,
      input.summary,
      input.bodyMarkdown,
      input.changeReason,
      actorRef,
    ),
    db.prepare(`
      UPDATE article SET active_revision_id = ?, updated_at = ? WHERE id = ?
    `).bind(revisionId, now, articleId),
    db.prepare(`
      INSERT INTO article_locale (article_id, locale, slug, title, summary, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `).bind(articleId, input.locale, input.slug, input.title, input.summary),
    ...taxonomyStatements(db, articleId, input.categoryId, input.tagIds),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.article.create', 'article', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      actorRef,
      articleId,
      JSON.stringify({ revisionId, storyId: input.storyId ?? null, status: 'draft' }),
      input.changeReason,
      traceId,
    ),
    ...(input.storyId ? [db.prepare(`
      UPDATE story_cluster SET status = 'drafted', updated_at = ? WHERE id = ?
    `).bind(now, input.storyId)] : []),
  ]);
  return articleId;
}

export async function updateArticle(
  db: D1Database,
  articleId: string,
  input: ArticleUpdateInput,
  actorRef: string,
  traceId: string,
): Promise<{ status: 'updated'; version: number; revisionId: string } | { status: 'not_found' | 'conflict' }> {
  validateSlug(input.slug);
  await validateTaxonomy(db, input.categoryId, input.tagIds);
  const article = await getArticleRow(db, articleId);
  if (!article) return { status: 'not_found' };
  if (article.version !== input.expectedVersion) return { status: 'conflict' };
  if (['in_review', 'scheduled', 'withdrawn'].includes(article.status)) {
    throw new Error('article_must_return_to_draft');
  }

  const revisionCount = await db.prepare(`
    SELECT COALESCE(MAX(revision_number), 0) AS revision_number
    FROM article_revision WHERE article_id = ?
  `).bind(articleId).first<{ revision_number: number }>();
  const revisionId = `revision_${crypto.randomUUID()}`;
  const nextVersion = article.version + 1;
  const now = new Date().toISOString();
  const nextStatus: ArticleStatus = article.status === 'rejected' ? 'draft' : article.status;
  const keepsPublishedProjection = ['published', 'corrected', 'distributed'].includes(article.status);
  await db.batch([
    db.prepare(`
      INSERT INTO article_revision (
        id, article_id, revision_number, locale, slug, title, summary, body_markdown,
        change_reason, editor_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      revisionId,
      articleId,
      Number(revisionCount?.revision_number ?? 0) + 1,
      input.locale,
      input.slug,
      input.title,
      input.summary,
      input.bodyMarkdown,
      input.changeReason,
      actorRef,
    ),
    db.prepare(`
      UPDATE article SET active_revision_id = ?, status = ?, access_level = ?,
        primary_locale = ?, version = ?, updated_at = ?
      WHERE id = ? AND version = ?
    `).bind(revisionId, nextStatus, input.accessLevel, input.locale, nextVersion, now, articleId, input.expectedVersion),
    ...(keepsPublishedProjection ? [] : [db.prepare(`
      INSERT INTO article_locale (article_id, locale, slug, title, summary, status, updated_at)
      VALUES (?, ?, ?, ?, ?, 'draft', ?)
      ON CONFLICT(article_id, locale) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        summary = excluded.summary,
        status = 'draft',
        updated_at = excluded.updated_at
    `).bind(articleId, input.locale, input.slug, input.title, input.summary, now)]),
    ...taxonomyStatements(db, articleId, input.categoryId, input.tagIds),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        before_json, after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.article.revise', 'article', ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      actorRef,
      articleId,
      JSON.stringify({ activeRevisionId: article.active_revision_id, version: article.version, status: article.status }),
      JSON.stringify({ activeRevisionId: revisionId, version: nextVersion, status: nextStatus }),
      input.changeReason,
      traceId,
    ),
  ]);
  return { status: 'updated', version: nextVersion, revisionId };
}

export async function listArticles(db: D1Database, status: string | null, limit = 50): Promise<ArticleSummary[]> {
  const rows = await db.prepare(`
    SELECT article.id, article.status, article.article_type, article.access_level,
      article.version, revision.title, revision.summary, article.updated_at, article.published_at
    FROM article
    JOIN article_revision AS revision ON revision.id = article.active_revision_id
    WHERE article.deleted_at IS NULL AND (? IS NULL OR article.status = ?)
    ORDER BY article.updated_at DESC
    LIMIT ?
  `).bind(status, status, limit).all<{
    id: string;
    status: ArticleStatus;
    article_type: string;
    access_level: string;
    version: number;
    title: string;
    summary: string;
    updated_at: string;
    published_at: string | null;
  }>();
  const output: ArticleSummary[] = [];
  for (const row of rows.results) {
    const taxonomy = await db.prepare(`
      SELECT node.id, node.name, node.taxonomy_type
      FROM article_taxonomy AS link
      JOIN taxonomy_node AS node ON node.id = link.taxonomy_id
      WHERE link.article_id = ?
      ORDER BY node.taxonomy_type, node.name
    `).bind(row.id).all<{ id: string; name: string; taxonomy_type: string }>();
    const category = taxonomy.results.find((item) => item.taxonomy_type === 'category');
    output.push({
      id: row.id,
      status: row.status,
      articleType: row.article_type,
      accessLevel: row.access_level,
      version: row.version,
      title: row.title,
      summary: row.summary,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
      category: category ? { id: category.id, name: category.name } : null,
      tags: taxonomy.results.filter((item) => item.taxonomy_type === 'tag').map(({ id, name }) => ({ id, name })),
    });
  }
  return output;
}

export async function getArticle(db: D1Database, articleId: string): Promise<Record<string, unknown> | null> {
  const article = await getArticleRow(db, articleId);
  if (!article) return null;
  const locale = await db.prepare(`
    SELECT locale, slug, title, summary, status FROM article_locale
    WHERE article_id = ? AND locale = ?
  `).bind(articleId, article.primary_locale).first<Record<string, unknown>>();
  const revisions = await db.prepare(`
    SELECT id, revision_number AS revisionNumber, locale, slug, title, summary,
      body_markdown AS bodyMarkdown, change_reason AS changeReason,
      editor_ref AS editorRef, created_at AS createdAt
    FROM article_revision WHERE article_id = ? ORDER BY revision_number DESC
  `).bind(articleId).all<Record<string, unknown>>();
  const approvals = await db.prepare(`
    SELECT id, revision_id AS revisionId, actor_ref AS actorRef, actor_role AS actorRole,
      decision, note, created_at AS createdAt
    FROM article_approval
    WHERE revision_id IN (SELECT id FROM article_revision WHERE article_id = ?)
    ORDER BY created_at DESC
  `).bind(articleId).all<Record<string, unknown>>();
  const taxonomy = await db.prepare(`
    SELECT node.id, node.name, node.taxonomy_type AS taxonomyType
    FROM article_taxonomy AS link
    JOIN taxonomy_node AS node ON node.id = link.taxonomy_id
    WHERE link.article_id = ? ORDER BY node.taxonomy_type, node.name
  `).bind(articleId).all<Record<string, unknown>>();
  const audit = await db.prepare(`
    SELECT action, actor_ref AS actorRef, reason, created_at AS createdAt
    FROM audit_log WHERE object_type = 'article' AND object_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).bind(articleId).all<Record<string, unknown>>();
  return {
    id: article.id,
    storyId: article.story_id,
    articleType: article.article_type,
    status: article.status,
    accessLevel: article.access_level,
    primaryLocale: article.primary_locale,
    activeRevisionId: article.active_revision_id,
    publishedRevisionId: article.published_revision_id,
    version: article.version,
    scheduledAt: article.scheduled_at,
    publishedAt: article.published_at,
    correctedAt: article.corrected_at,
    withdrawnAt: article.withdrawn_at,
    locale,
    revisions: revisions.results,
    approvals: approvals.results,
    taxonomy: taxonomy.results,
    audit: audit.results,
  };
}

function targetStatus(action: ArticleAction, current: ArticleStatus): ArticleStatus | null {
  if (action === 'submit') return 'in_review';
  if (action === 'return' || action === 'reopen') return 'draft';
  if (action === 'reject') return 'rejected';
  if (action === 'schedule') return 'scheduled';
  if (action === 'publish') return 'published';
  if (action === 'correct') return 'corrected';
  if (action === 'withdraw') return 'withdrawn';
  return current;
}

export async function performArticleAction(
  db: D1Database,
  articleId: string,
  action: ArticleAction,
  input: { reason: string; scheduledAt?: string | null },
  actorRef: string,
  traceId: string,
  idempotencyKey: string,
): Promise<{ status: 'updated'; articleStatus: ArticleStatus; version: number } | { status: 'not_found' }> {
  const article = await getArticleRow(db, articleId);
  if (!article) return { status: 'not_found' };
  if (!article.active_revision_id) throw new Error('active_revision_required');

  const replay = await db.prepare(`
    SELECT response_json FROM idempotency_record
    WHERE scope = 'article_action' AND idempotency_key = ? AND status = 'succeeded'
  `).bind(idempotencyKey).first<{ response_json: string }>();
  if (replay?.response_json) return JSON.parse(replay.response_json) as { status: 'updated'; articleStatus: ArticleStatus; version: number };

  const nextVersion = article.version + 1;
  if (action === 'approve') {
    await db.batch([
      db.prepare(`
        INSERT OR IGNORE INTO article_approval (
          id, revision_id, actor_ref, actor_role, decision, note
        ) VALUES (?, ?, ?, 'admin', 'approved', ?)
      `).bind(`approval_${crypto.randomUUID()}`, article.active_revision_id, actorRef, input.reason),
      db.prepare(`
        UPDATE article SET version = ?, updated_at = ? WHERE id = ?
      `).bind(nextVersion, new Date().toISOString(), articleId),
      db.prepare(`
        INSERT INTO audit_log (
          id, actor_ref, actor_role, action, object_type, object_id,
          after_json, reason, trace_id, idempotency_key
        ) VALUES (?, ?, 'admin', 'news.article.approve', 'article', ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), actorRef, articleId,
        JSON.stringify({ revisionId: article.active_revision_id }), input.reason, traceId, idempotencyKey,
      ),
    ]);
    const response = { status: 'updated' as const, articleStatus: article.status, version: nextVersion };
    await storeIdempotency(db, idempotencyKey, articleId, response);
    return response;
  }

  const nextStatus = targetStatus(action, article.status);
  if (!nextStatus || !canTransitionArticle(article.status, nextStatus)) throw new Error('invalid_article_action');
  const now = new Date().toISOString();
  const publicationEvent = ['schedule', 'publish', 'correct', 'withdraw'].includes(action);
  const publishedRevisionId = ['publish', 'correct'].includes(action)
    ? article.active_revision_id
    : article.published_revision_id;
  const articleLocaleStatus = ['publish', 'correct'].includes(action)
    ? 'published'
    : action === 'withdraw' ? 'withdrawn' : 'draft';
  const eventType = action === 'schedule' ? 'scheduled' : action === 'correct' ? 'corrected' : action === 'withdraw' ? 'withdrawn' : 'published';

  await db.batch([
    ...(action === 'reject' ? [db.prepare(`
      INSERT OR IGNORE INTO article_approval (
        id, revision_id, actor_ref, actor_role, decision, note
      ) VALUES (?, ?, ?, 'admin', 'rejected', ?)
    `).bind(`approval_${crypto.randomUUID()}`, article.active_revision_id, actorRef, input.reason)] : []),
    db.prepare(`
      UPDATE article SET
        status = ?,
        published_revision_id = ?,
        scheduled_at = CASE WHEN ? = 'scheduled' THEN ? WHEN ? = 'draft' THEN NULL ELSE scheduled_at END,
        published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END,
        corrected_at = CASE WHEN ? = 'corrected' THEN ? ELSE corrected_at END,
        withdrawn_at = CASE WHEN ? = 'withdrawn' THEN ? WHEN ? = 'draft' THEN NULL ELSE withdrawn_at END,
        version = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      nextStatus,
      publishedRevisionId,
      nextStatus,
      input.scheduledAt ?? null,
      nextStatus,
      nextStatus,
      now,
      nextStatus,
      now,
      nextStatus,
      now,
      nextStatus,
      nextVersion,
      now,
      articleId,
    ),
    db.prepare(`
      UPDATE article_locale SET
        slug = CASE WHEN ? IN ('published', 'corrected') THEN COALESCE((
          SELECT revision.slug FROM article_revision AS revision WHERE revision.id = ?
        ), slug) ELSE slug END,
        title = CASE WHEN ? IN ('published', 'corrected') THEN (
          SELECT revision.title FROM article_revision AS revision WHERE revision.id = ?
        ) ELSE title END,
        summary = CASE WHEN ? IN ('published', 'corrected') THEN (
          SELECT revision.summary FROM article_revision AS revision WHERE revision.id = ?
        ) ELSE summary END,
        status = ?, updated_at = ?
      WHERE article_id = ? AND locale = ?
    `).bind(
      nextStatus, article.active_revision_id,
      nextStatus, article.active_revision_id,
      nextStatus, article.active_revision_id,
      articleLocaleStatus, now, articleId, article.primary_locale,
    ),
    ...(publicationEvent ? [db.prepare(`
      INSERT INTO article_publication_event (
        id, article_id, revision_id, event_type, actor_ref, reason,
        idempotency_key, trace_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `publication_${crypto.randomUUID()}`,
      articleId,
      article.active_revision_id,
      eventType,
      actorRef,
      input.reason,
      idempotencyKey,
      traceId,
    )] : []),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        before_json, after_json, reason, trace_id, idempotency_key
      ) VALUES (?, ?, 'admin', ?, 'article', ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, `news.article.${action}`, articleId,
      JSON.stringify({ status: article.status, version: article.version }),
      JSON.stringify({ status: nextStatus, version: nextVersion }),
      input.reason, traceId, idempotencyKey,
    ),
  ]);
  const response = { status: 'updated' as const, articleStatus: nextStatus, version: nextVersion };
  await storeIdempotency(db, idempotencyKey, articleId, response);
  return response;
}

async function storeIdempotency(
  db: D1Database,
  key: string,
  articleId: string,
  response: Record<string, unknown>,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  await db.prepare(`
    INSERT INTO idempotency_record (
      scope, idempotency_key, request_hash, status, response_code,
      response_json, object_type, object_id, completed_at, expires_at
    ) VALUES ('article_action', ?, ?, 'succeeded', 200, ?, 'article', ?, ?, ?)
    ON CONFLICT(scope, idempotency_key) DO UPDATE SET
      status = 'succeeded', response_code = 200, response_json = excluded.response_json,
      object_type = 'article', object_id = excluded.object_id,
      completed_at = excluded.completed_at, expires_at = excluded.expires_at
  `).bind(key, key, JSON.stringify(response), articleId, now.toISOString(), expiresAt).run();
}

export async function editorialDashboard(db: D1Database): Promise<Record<string, number>> {
  const row = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM source_item WHERE processing_status = 'normalized') AS pendingEnrichment,
      (SELECT COUNT(*) FROM story_cluster WHERE status IN ('clustered', 'enriched')) AS candidates,
      (SELECT COUNT(*) FROM article WHERE status = 'draft' AND deleted_at IS NULL) AS drafts,
      (SELECT COUNT(*) FROM article WHERE status = 'in_review' AND deleted_at IS NULL) AS inReview,
      (SELECT COUNT(*) FROM article WHERE status IN ('published', 'corrected', 'distributed') AND deleted_at IS NULL) AS live,
      (SELECT COUNT(*) FROM article WHERE status = 'withdrawn' AND deleted_at IS NULL) AS withdrawn
  `).first<Record<string, number>>();
  return row ?? { pendingEnrichment: 0, candidates: 0, drafts: 0, inReview: 0, live: 0, withdrawn: 0 };
}
