export interface PublicArticleCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  articleType: string;
  publishedAt: string;
  correctedAt: string | null;
  category: { slug: string; name: string } | null;
  tags: Array<{ slug: string; name: string }>;
}

export interface PublicSignal {
  id: string;
  title: string;
  summary: string;
  occurredAt: string | null;
  sourceName: string;
  sourceUrl: string;
  sourceTier: string;
  qualityScore: number | null;
  category: { slug: string; name: string } | null;
  tags: Array<{ slug: string; name: string }>;
}

async function taxonomyForStory(db: D1Database, storyId: string) {
  const rows = await db.prepare(`
    SELECT node.slug, node.name, link.relation_type
    FROM story_taxonomy AS link
    JOIN taxonomy_node AS node ON node.id = link.taxonomy_id
    WHERE link.story_id = ? AND node.status = 'active'
    ORDER BY link.relation_type, node.name
  `).bind(storyId).all<{ slug: string; name: string; relation_type: string }>();
  const category = rows.results.find((row) => row.relation_type === 'primary') ?? null;
  return {
    category: category ? { slug: category.slug, name: category.name } : null,
    tags: rows.results.filter((row) => row.relation_type === 'tag').map((row) => ({ slug: row.slug, name: row.name })),
  };
}

async function taxonomyForArticle(db: D1Database, articleId: string) {
  const rows = await db.prepare(`
    SELECT node.slug, node.name, node.taxonomy_type
    FROM article_taxonomy AS link
    JOIN taxonomy_node AS node ON node.id = link.taxonomy_id
    WHERE link.article_id = ? AND node.status = 'active'
    ORDER BY node.taxonomy_type, node.name
  `).bind(articleId).all<{ slug: string; name: string; taxonomy_type: string }>();
  const category = rows.results.find((row) => row.taxonomy_type === 'category') ?? null;
  return {
    category: category ? { slug: category.slug, name: category.name } : null,
    tags: rows.results.filter((row) => row.taxonomy_type === 'tag').map((row) => ({ slug: row.slug, name: row.name })),
  };
}

export async function listPublicArticles(
  db: D1Database,
  input: { limit?: number; category?: string | null; tag?: string | null } = {},
): Promise<PublicArticleCard[]> {
  const limit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 20)));
  const rows = await db.prepare(`
    SELECT article.id, article.story_id, article.article_type, article.published_at,
      article.corrected_at, locale.slug, revision.title, revision.summary
    FROM article
    JOIN article_locale AS locale ON locale.article_id = article.id
      AND locale.locale = article.primary_locale AND locale.status = 'published'
    JOIN article_revision AS revision ON revision.id = article.published_revision_id
    WHERE article.status IN ('published', 'corrected', 'distributed')
      AND article.access_level = 'free'
      AND article.deleted_at IS NULL
      AND (? IS NULL OR EXISTS (
        SELECT 1 FROM article_taxonomy AS category_link
        JOIN taxonomy_node AS category ON category.id = category_link.taxonomy_id
        WHERE category_link.article_id = article.id
          AND category.taxonomy_type = 'category' AND category.slug = ?
      ))
      AND (? IS NULL OR EXISTS (
        SELECT 1 FROM article_taxonomy AS tag_link
        JOIN taxonomy_node AS tag ON tag.id = tag_link.taxonomy_id
        WHERE tag_link.article_id = article.id
          AND tag.taxonomy_type = 'tag' AND tag.slug = ?
      ))
    ORDER BY COALESCE(article.corrected_at, article.published_at) DESC
    LIMIT ?
  `).bind(input.category ?? null, input.category ?? null, input.tag ?? null, input.tag ?? null, limit)
    .all<{
      id: string; story_id: string | null; article_type: string; published_at: string;
      corrected_at: string | null; slug: string; title: string; summary: string;
    }>();
  const cards: PublicArticleCard[] = [];
  for (const row of rows.results) {
    const taxonomy = await taxonomyForArticle(db, row.id);
    cards.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      articleType: row.article_type,
      publishedAt: row.published_at,
      correctedAt: row.corrected_at,
      ...taxonomy,
    });
  }
  return cards;
}

export async function listPublicSignals(db: D1Database, limit = 18): Promise<PublicSignal[]> {
  const safeLimit = Math.max(1, Math.min(30, Math.floor(limit)));
  const rows = await db.prepare(`
    SELECT story.id, story.canonical_title, story.occurred_at,
      item.title AS source_title, COALESCE(item.summary, '') AS summary,
      item.canonical_url, item.quality_score, source.name AS source_name,
      source.trust_tier
    FROM story_cluster AS story
    JOIN story_source AS relation ON relation.story_id = story.id
      AND relation.relation_type = 'primary'
    JOIN source_item AS item ON item.id = relation.item_id
    JOIN news_source AS source ON source.id = item.source_id AND source.status = 'active'
    JOIN source_ingestion_policy AS policy ON policy.source_id = source.id
      AND policy.policy_status = 'approved' AND policy.robots_status = 'allowed'
    WHERE story.status <> 'archived'
      AND NOT EXISTS (
        SELECT 1 FROM article
        WHERE article.story_id = story.id
          AND article.status IN ('published', 'corrected', 'distributed')
          AND article.deleted_at IS NULL
      )
    ORDER BY COALESCE(story.occurred_at, story.created_at) DESC,
      COALESCE(item.quality_score, 0) DESC
    LIMIT ?
  `).bind(safeLimit).all<{
    id: string; canonical_title: string; occurred_at: string | null;
    source_title: string; summary: string; canonical_url: string;
    quality_score: number | null; source_name: string; trust_tier: string;
  }>();
  const signals: PublicSignal[] = [];
  for (const row of rows.results) {
    signals.push({
      id: row.id,
      title: row.canonical_title || row.source_title,
      summary: row.summary.slice(0, 360),
      occurredAt: row.occurred_at,
      sourceName: row.source_name,
      sourceUrl: row.canonical_url,
      sourceTier: row.trust_tier,
      qualityScore: row.quality_score === null ? null : Number(row.quality_score),
      ...(await taxonomyForStory(db, row.id)),
    });
  }
  return signals;
}

export async function publicHome(db: D1Database) {
  const [articles, signals, categories] = await Promise.all([
    listPublicArticles(db, { limit: 12 }),
    listPublicSignals(db, 18),
    db.prepare(`
      SELECT node.slug, node.name, COUNT(DISTINCT story.story_id) AS story_count
      FROM taxonomy_node AS node
      LEFT JOIN story_taxonomy AS story ON story.taxonomy_id = node.id
        AND story.relation_type = 'primary'
      WHERE node.taxonomy_type = 'category' AND node.status = 'active'
      GROUP BY node.id ORDER BY story_count DESC, node.name
    `).all<{ slug: string; name: string; story_count: number }>(),
  ]);
  return {
    featured: articles[0] ?? null,
    articles,
    signals,
    categories: categories.results.map((category) => ({
      slug: category.slug,
      name: category.name,
      storyCount: Number(category.story_count),
    })),
    disclosure: '来源信号来自已审核的一手官方 Feed；StudyAI 原创文章只有在人工批准后才会公开。',
  };
}

export async function getPublicArticle(db: D1Database, slug: string) {
  const row = await db.prepare(`
    SELECT article.id, article.story_id, article.article_type, article.published_at,
      article.corrected_at, article.primary_locale, locale.slug,
      revision.title, revision.summary, revision.body_markdown
    FROM article
    JOIN article_locale AS locale ON locale.article_id = article.id
      AND locale.locale = article.primary_locale AND locale.status = 'published'
    JOIN article_revision AS revision ON revision.id = article.published_revision_id
    WHERE locale.slug = ?
      AND article.status IN ('published', 'corrected', 'distributed')
      AND article.access_level = 'free' AND article.deleted_at IS NULL
    LIMIT 1
  `).bind(slug).first<{
    id: string; story_id: string | null; article_type: string; published_at: string;
    corrected_at: string | null; primary_locale: string; slug: string;
    title: string; summary: string; body_markdown: string;
  }>();
  if (!row) return null;
  const [taxonomy, sources, learning, corrections] = await Promise.all([
    taxonomyForArticle(db, row.id),
    row.story_id ? db.prepare(`
      SELECT source.name, item.canonical_url AS url, source.trust_tier AS tier
      FROM story_source AS relation
      JOIN source_item AS item ON item.id = relation.item_id
      JOIN news_source AS source ON source.id = item.source_id
      WHERE relation.story_id = ? AND relation.relation_type <> 'duplicate'
      ORDER BY CASE relation.relation_type WHEN 'primary' THEN 0 ELSE 1 END
    `).bind(row.story_id).all<{ name: string; url: string; tier: string }>() : Promise.resolve({ results: [] }),
    row.story_id ? db.prepare(`
      SELECT object_type AS objectType, core_object_id AS coreObjectId,
        core_slug AS coreSlug, core_title AS coreTitle, core_url AS coreUrl,
        relevance_score AS relevanceScore, impact_type AS impactType,
        evidence_excerpt AS evidenceExcerpt, reason
      FROM story_learning_link
      WHERE story_id = ? AND review_status = 'approved'
      ORDER BY object_type, relevance_score DESC
    `).bind(row.story_id).all<Record<string, unknown>>() : Promise.resolve({ results: [] }),
    db.prepare(`
      SELECT event_type AS eventType, reason, created_at AS createdAt
      FROM article_publication_event
      WHERE article_id = ? AND event_type IN ('corrected', 'withdrawn')
      ORDER BY created_at DESC
    `).bind(row.id).all<Record<string, unknown>>(),
  ]);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    bodyMarkdown: row.body_markdown,
    articleType: row.article_type,
    locale: row.primary_locale,
    publishedAt: row.published_at,
    correctedAt: row.corrected_at,
    ...taxonomy,
    sources: sources.results,
    learningLinks: learning.results,
    corrections: corrections.results,
    aiDisclosure: 'AI 辅助整理；事实主张、来源和发布状态由人工审核。',
  };
}
