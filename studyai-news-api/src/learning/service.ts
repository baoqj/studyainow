import type { Env } from '../env';
import { sha256Hex } from '../ingestion/hash';

export const LEARNING_CATALOG_CONTRACT = 'studyai-learning-catalog/v1';
export const LEARNING_RETRIEVAL_VERSION = 'hybrid-keyword-vectorize-v1';
export const LEARNING_EMBEDDING_VERSION = 'hashed-token-64-v1';

type ReviewStatus = 'suggested' | 'approved' | 'rejected' | 'withdrawn' | 'stale';

export interface CatalogSkill {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  definition: string;
  category: string;
  aliases: string[];
  taxonomyVersion: number;
  url: string;
}

export interface CatalogCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  topic: string;
  level: string;
  skillIds: string[];
  url: string;
}

export interface LearningCatalog {
  contractVersion: typeof LEARNING_CATALOG_CONTRACT;
  catalogVersion: string;
  checksum: string;
  generatedAt: string;
  skills: CatalogSkill[];
  courses: CatalogCourse[];
}

export interface LearningLinkSummary {
  id: string;
  storyId: string;
  storyTitle: string;
  articleId: string | null;
  objectType: 'skill' | 'course';
  coreObjectId: string;
  coreSlug: string;
  coreTitle: string;
  coreUrl: string;
  relevanceScore: number;
  keywordScore: number;
  vectorScore: number;
  relationshipType: string;
  impactType: string;
  evidenceExcerpt: string;
  reason: string;
  catalogVersion: string;
  retrievalVersion: string;
  embeddingVersion: string;
  reviewStatus: ReviewStatus;
  reviewerRef: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}

interface RankedObject {
  objectType: 'skill' | 'course';
  id: string;
  slug: string;
  title: string;
  url: string;
  text: string;
  keywordScore: number;
  vectorScore: number;
  relevanceScore: number;
}

function assertString(value: unknown, name: string, max = 4000): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new Error(`invalid_${name}`);
  return value;
}

function assertStringArray(value: unknown, name: string, maxItems = 100): string[] {
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== 'string' || item.length > 500)) {
    throw new Error(`invalid_${name}`);
  }
  return [...new Set(value as string[])];
}

function parseSkill(value: unknown): CatalogSkill {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_catalog_skill');
  const skill = value as Record<string, unknown>;
  const taxonomyVersion = Number(skill.taxonomyVersion);
  if (!Number.isInteger(taxonomyVersion) || taxonomyVersion < 1) throw new Error('invalid_taxonomy_version');
  return {
    id: assertString(skill.id, 'skill_id', 160),
    slug: assertString(skill.slug, 'skill_slug', 160),
    nameZh: assertString(skill.nameZh, 'skill_name_zh', 300),
    nameEn: assertString(skill.nameEn, 'skill_name_en', 300),
    definition: assertString(skill.definition, 'skill_definition', 4000),
    category: assertString(skill.category, 'skill_category', 300),
    aliases: assertStringArray(skill.aliases, 'skill_aliases', 100),
    taxonomyVersion,
    url: assertString(skill.url, 'skill_url', 1000),
  };
}

function parseCourse(value: unknown): CatalogCourse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_catalog_course');
  const course = value as Record<string, unknown>;
  return {
    id: assertString(course.id, 'course_id', 160),
    slug: assertString(course.slug, 'course_slug', 160),
    title: assertString(course.title, 'course_title', 500),
    subtitle: typeof course.subtitle === 'string' ? course.subtitle.slice(0, 1000) : '',
    description: typeof course.description === 'string' ? course.description.slice(0, 4000) : '',
    topic: typeof course.topic === 'string' ? course.topic.slice(0, 500) : '',
    level: typeof course.level === 'string' ? course.level.slice(0, 100) : '',
    skillIds: assertStringArray(course.skillIds, 'course_skill_ids', 500),
    url: assertString(course.url, 'course_url', 1000),
  };
}

export function parseLearningCatalog(value: unknown): LearningCatalog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_learning_catalog');
  const catalog = value as Record<string, unknown>;
  if (catalog.contractVersion !== LEARNING_CATALOG_CONTRACT) throw new Error('unsupported_learning_catalog_contract');
  if (!Array.isArray(catalog.skills) || catalog.skills.length > 1000) throw new Error('invalid_catalog_skills');
  if (!Array.isArray(catalog.courses) || catalog.courses.length > 500) throw new Error('invalid_catalog_courses');
  return {
    contractVersion: LEARNING_CATALOG_CONTRACT,
    catalogVersion: assertString(catalog.catalogVersion, 'catalog_version', 200),
    checksum: assertString(catalog.checksum, 'catalog_checksum', 128),
    generatedAt: assertString(catalog.generatedAt, 'catalog_generated_at', 80),
    skills: catalog.skills.map(parseSkill),
    courses: catalog.courses.map(parseCourse),
  };
}

function tokenize(value: string): string[] {
  return [...new Set(value.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? [])]
    .filter((token) => token.length > 1)
    .slice(0, 1200);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashedTextVector(value: string): number[] {
  const vector = Array.from({ length: 64 }, () => 0);
  const tokens = tokenize(value);
  for (const token of tokens) {
    const hash = hashToken(token);
    const index = hash % vector.length;
    vector[index] = (vector[index] ?? 0) + ((hash & 64) === 0 ? 1 : -1);
  }
  const magnitude = Math.sqrt(vector.reduce((sum, component) => sum + component * component, 0)) || 1;
  return vector.map((component) => component / magnitude);
}

function cosine(left: number[], right: number[]): number {
  const score = left.reduce((sum, component, index) => sum + component * (right[index] ?? 0), 0);
  return Math.max(0, Math.min(1, (score + 1) / 2));
}

function keywordRelevance(queryText: string, candidateText: string, names: string[]): number {
  const query = queryText.normalize('NFKC').toLocaleLowerCase();
  const queryTokens = new Set(tokenize(query));
  const candidateTokens = tokenize(candidateText);
  const overlap = candidateTokens.filter((token) => queryTokens.has(token));
  const exactName = names.some((name) => {
    const normalized = name.normalize('NFKC').toLocaleLowerCase().trim();
    return normalized.length >= 3 && query.includes(normalized);
  });
  const tokenScore = Math.min(1, overlap.length / Math.max(2, Math.min(8, candidateTokens.length)));
  return Math.min(1, (exactName ? 0.72 : 0) + tokenScore * (exactName ? 0.28 : 0.9));
}

function objectsFromCatalog(catalog: LearningCatalog): RankedObject[] {
  const skillsById = new Map(catalog.skills.map((skill) => [skill.id, skill]));
  return [
    ...catalog.skills.map((skill) => ({
      objectType: 'skill' as const,
      id: skill.id,
      slug: skill.slug,
      title: skill.nameZh || skill.nameEn,
      url: skill.url,
      text: [skill.nameZh, skill.nameEn, skill.definition, skill.category, ...skill.aliases].join(' '),
      keywordScore: 0,
      vectorScore: 0,
      relevanceScore: 0,
    })),
    ...catalog.courses.map((course) => ({
      objectType: 'course' as const,
      id: course.id,
      slug: course.slug,
      title: course.title,
      url: course.url,
      text: [
        course.title, course.subtitle, course.description, course.topic, course.level,
        ...course.skillIds.flatMap((skillId) => {
          const skill = skillsById.get(skillId);
          return skill ? [skill.nameZh, skill.nameEn, skill.definition, ...skill.aliases] : [];
        }),
      ].join(' '),
      keywordScore: 0,
      vectorScore: 0,
      relevanceScore: 0,
    })),
  ];
}

async function storyInput(db: D1Database, storyId: string): Promise<{ queryText: string; evidence: string } | null> {
  const story = await db.prepare(`
    SELECT canonical_title FROM story_cluster WHERE id = ? AND status <> 'archived' LIMIT 1
  `).bind(storyId).first<{ canonical_title: string }>();
  if (!story) return null;
  const sources = await db.prepare(`
    SELECT item.title, COALESCE(item.summary, '') AS summary, source.name AS source_name,
      link.relation_type
    FROM story_source AS link
    JOIN source_item AS item ON item.id = link.item_id
    JOIN news_source AS source ON source.id = item.source_id
    WHERE link.story_id = ?
    ORDER BY CASE link.relation_type WHEN 'primary' THEN 0 ELSE 1 END,
      COALESCE(item.quality_score, 0) DESC
    LIMIT 6
  `).bind(storyId).all<{ title: string; summary: string; source_name: string; relation_type: string }>();
  const taxonomy = await db.prepare(`
    SELECT node.name FROM story_taxonomy AS link
    JOIN taxonomy_node AS node ON node.id = link.taxonomy_id
    WHERE link.story_id = ? AND node.status = 'active'
    ORDER BY link.relation_type, node.name
  `).bind(storyId).all<{ name: string }>();
  const claims = await db.prepare(`
    SELECT claim_text FROM claim
    WHERE story_id = ? AND support_status = 'supported'
    ORDER BY importance, created_at LIMIT 20
  `).bind(storyId).all<{ claim_text: string }>();
  const sourceText = sources.results.flatMap((source) => [source.title, source.summary]).filter(Boolean);
  const queryText = [story.canonical_title, ...sourceText, ...taxonomy.results.map((item) => item.name), ...claims.results.map((item) => item.claim_text)].join('\n').slice(0, 16_000);
  const primary = sources.results[0];
  const evidence = (primary?.summary || primary?.title || story.canonical_title).trim().slice(0, 1000);
  return { queryText, evidence };
}

async function vectorizeScores(env: Env, catalog: LearningCatalog, objects: RankedObject[], queryText: string, shouldUpsert: boolean): Promise<{ scores: Map<string, number>; status: 'indexed' | 'degraded' }> {
  if (!env.LEARNING_VECTORS) return { scores: new Map(), status: 'degraded' };
  try {
    const vectors = objects.map((object) => ({
      id: `${object.objectType}:${object.id}`,
      values: hashedTextVector(object.text),
      namespace: catalog.catalogVersion,
      metadata: {
        objectType: object.objectType,
        coreObjectId: object.id,
        catalogVersion: catalog.catalogVersion,
      },
    }));
    if (shouldUpsert) {
      for (let offset = 0; offset < vectors.length; offset += 100) {
        await env.LEARNING_VECTORS.upsert(vectors.slice(offset, offset + 100));
      }
    }
    const matches = await env.LEARNING_VECTORS.query(hashedTextVector(queryText), {
      topK: Math.min(50, Math.max(10, objects.length)),
      namespace: catalog.catalogVersion,
      returnMetadata: 'all',
    });
    return {
      scores: new Map(matches.matches.map((match) => [match.id, Math.max(0, Math.min(1, match.score))])),
      status: 'indexed',
    };
  } catch {
    return { scores: new Map(), status: 'degraded' };
  }
}

function rankCatalog(catalog: LearningCatalog, queryText: string, vectorScores: Map<string, number>): RankedObject[] {
  const queryVector = hashedTextVector(queryText);
  return objectsFromCatalog(catalog).map((object) => {
    const names = object.objectType === 'skill'
      ? catalog.skills.filter((skill) => skill.id === object.id).flatMap((skill) => [skill.nameZh, skill.nameEn, ...skill.aliases])
      : [object.title];
    const keywordScore = keywordRelevance(queryText, object.text, names);
    const vectorScore = vectorScores.get(`${object.objectType}:${object.id}`) ?? cosine(queryVector, hashedTextVector(object.text));
    const relevanceScore = Math.round(Math.min(1, keywordScore * 0.72 + vectorScore * 0.28) * 10_000) / 10_000;
    return { ...object, keywordScore, vectorScore, relevanceScore };
  });
}

async function catalogSync(
  db: D1Database,
  catalog: LearningCatalog,
  vectorStatus: 'indexed' | 'degraded',
  actorRef: string,
): Promise<string> {
  const existing = await db.prepare(`
    SELECT id FROM core_catalog_sync
    WHERE catalog_version = ? AND catalog_checksum = ? AND vector_status = ? LIMIT 1
  `).bind(catalog.catalogVersion, catalog.checksum, vectorStatus).first<{ id: string }>();
  if (existing) return existing.id;
  const id = `catalogsync_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO core_catalog_sync (
      id, contract_version, catalog_version, catalog_checksum, skill_count,
      course_count, retrieval_version, embedding_version, vector_status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, catalog.contractVersion, catalog.catalogVersion, catalog.checksum,
    catalog.skills.length, catalog.courses.length, LEARNING_RETRIEVAL_VERSION,
    LEARNING_EMBEDDING_VERSION, vectorStatus, actorRef,
  ).run();
  return id;
}

function suggestionStatements(
  db: D1Database,
  storyId: string,
  ranked: RankedObject[],
  catalog: LearningCatalog,
  evidence: string,
): D1PreparedStatement[] {
  return ranked.map((object) => db.prepare(`
    INSERT INTO story_learning_link (
      id, story_id, object_type, core_object_id, core_slug, core_title, core_url,
      relevance_score, keyword_score, vector_score, relationship_type, impact_type,
      evidence_excerpt, reason, catalog_version, catalog_checksum,
      retrieval_version, embedding_version, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'suggested')
    ON CONFLICT(story_id, object_type, core_object_id) DO UPDATE SET
      core_slug = excluded.core_slug,
      core_title = excluded.core_title,
      core_url = excluded.core_url,
      relevance_score = excluded.relevance_score,
      keyword_score = excluded.keyword_score,
      vector_score = excluded.vector_score,
      evidence_excerpt = excluded.evidence_excerpt,
      reason = excluded.reason,
      catalog_version = excluded.catalog_version,
      catalog_checksum = excluded.catalog_checksum,
      retrieval_version = excluded.retrieval_version,
      embedding_version = excluded.embedding_version,
      review_status = CASE
        WHEN story_learning_link.review_status = 'approved' THEN 'approved'
        ELSE 'suggested'
      END,
      reviewer_ref = CASE
        WHEN story_learning_link.review_status = 'approved' THEN story_learning_link.reviewer_ref
        ELSE NULL
      END,
      reviewed_at = CASE
        WHEN story_learning_link.review_status = 'approved' THEN story_learning_link.reviewed_at
        ELSE NULL
      END,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    `learning_${crypto.randomUUID()}`, storyId, object.objectType, object.id, object.slug,
    object.title, object.url, object.relevanceScore, object.keywordScore, object.vectorScore,
    object.objectType === 'skill' ? 'applied' : 'learn_next',
    object.objectType === 'skill' ? 'practice' : 'learn',
    evidence,
    object.objectType === 'skill'
      ? '标题、来源摘要或已核验 Claim 与该规范技能存在混合检索匹配。'
      : '新闻主题与课程标题、简介或其已审核技能覆盖存在混合检索匹配。',
    catalog.catalogVersion, catalog.checksum, LEARNING_RETRIEVAL_VERSION, LEARNING_EMBEDDING_VERSION,
  ));
}

export async function generateLearningLinks(
  env: Env,
  storyId: string,
  catalogValue: unknown,
  actorRef: string,
  traceId: string,
): Promise<{ runId: string; suggestions: number; vectorStatus: 'indexed' | 'degraded'; catalogVersion: string; reused: boolean }> {
  const catalog = parseLearningCatalog(catalogValue);
  const input = await storyInput(env.DB, storyId);
  if (!input) throw new Error('story_not_found');
  const queryHash = await sha256Hex(input.queryText);
  const objects = objectsFromCatalog(catalog);
  const existingIndexedCatalog = await env.DB.prepare(`
    SELECT id FROM core_catalog_sync
    WHERE catalog_version = ? AND catalog_checksum = ? AND vector_status = 'indexed' LIMIT 1
  `).bind(catalog.catalogVersion, catalog.checksum).first<{ id: string }>();
  const vectorResult = await vectorizeScores(env, catalog, objects, input.queryText, !existingIndexedCatalog);
  const syncId = await catalogSync(env.DB, catalog, vectorResult.status, actorRef);
  const existing = await env.DB.prepare(`
    SELECT id, suggestion_count FROM learning_link_run
    WHERE story_id = ? AND catalog_sync_id = ? AND query_hash = ? LIMIT 1
  `).bind(storyId, syncId, queryHash).first<{ id: string; suggestion_count: number }>();
  if (existing) return {
    runId: existing.id,
    suggestions: Number(existing.suggestion_count),
    vectorStatus: vectorResult.status,
    catalogVersion: catalog.catalogVersion,
    reused: true,
  };

  const ranked = rankCatalog(catalog, input.queryText, vectorResult.scores);
  const selected = [
    ...ranked.filter((item) => item.objectType === 'skill' && item.relevanceScore >= 0.7)
      .sort((left, right) => right.relevanceScore - left.relevanceScore).slice(0, 5),
    ...ranked.filter((item) => item.objectType === 'course' && item.relevanceScore >= 0.7)
      .sort((left, right) => right.relevanceScore - left.relevanceScore).slice(0, 3),
  ];
  const runId = `learningrun_${crypto.randomUUID()}`;
  await env.DB.batch([
    ...suggestionStatements(env.DB, storyId, selected, catalog, input.evidence),
    env.DB.prepare(`
      UPDATE story_learning_link SET review_status = 'stale', updated_at = ?
      WHERE story_id = ? AND review_status = 'suggested' AND catalog_version <> ?
    `).bind(new Date().toISOString(), storyId, catalog.catalogVersion),
    env.DB.prepare(`
      INSERT INTO learning_link_run (
        id, story_id, catalog_sync_id, query_hash, retrieval_version, embedding_version,
        candidate_count, suggestion_count, vector_status, actor_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      runId, storyId, syncId, queryHash, LEARNING_RETRIEVAL_VERSION,
      LEARNING_EMBEDDING_VERSION, objects.length, selected.length, vectorResult.status, actorRef,
    ),
    env.DB.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.learning.generate', 'story', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, storyId,
      JSON.stringify({ runId, catalogVersion: catalog.catalogVersion, suggestions: selected.length, vectorStatus: vectorResult.status }),
      'Generate versioned skill and course suggestions', traceId,
    ),
  ]);
  return { runId, suggestions: selected.length, vectorStatus: vectorResult.status, catalogVersion: catalog.catalogVersion, reused: false };
}

function mapLearningLink(row: Record<string, unknown>): LearningLinkSummary {
  return {
    id: String(row.id),
    storyId: String(row.storyId),
    storyTitle: String(row.storyTitle),
    articleId: row.articleId ? String(row.articleId) : null,
    objectType: row.objectType as 'skill' | 'course',
    coreObjectId: String(row.coreObjectId),
    coreSlug: String(row.coreSlug),
    coreTitle: String(row.coreTitle),
    coreUrl: String(row.coreUrl),
    relevanceScore: Number(row.relevanceScore),
    keywordScore: Number(row.keywordScore),
    vectorScore: Number(row.vectorScore),
    relationshipType: String(row.relationshipType),
    impactType: String(row.impactType),
    evidenceExcerpt: String(row.evidenceExcerpt),
    reason: String(row.reason),
    catalogVersion: String(row.catalogVersion),
    retrievalVersion: String(row.retrievalVersion),
    embeddingVersion: String(row.embeddingVersion),
    reviewStatus: row.reviewStatus as ReviewStatus,
    reviewerRef: row.reviewerRef ? String(row.reviewerRef) : null,
    reviewedAt: row.reviewedAt ? String(row.reviewedAt) : null,
    updatedAt: String(row.updatedAt),
  };
}

const LEARNING_LINK_SELECT = `
  SELECT link.id, link.story_id AS storyId, story.canonical_title AS storyTitle,
    article.id AS articleId, link.object_type AS objectType,
    link.core_object_id AS coreObjectId, link.core_slug AS coreSlug,
    link.core_title AS coreTitle, link.core_url AS coreUrl,
    link.relevance_score AS relevanceScore, link.keyword_score AS keywordScore,
    link.vector_score AS vectorScore, link.relationship_type AS relationshipType,
    link.impact_type AS impactType, link.evidence_excerpt AS evidenceExcerpt,
    link.reason, link.catalog_version AS catalogVersion,
    link.retrieval_version AS retrievalVersion, link.embedding_version AS embeddingVersion,
    link.review_status AS reviewStatus, link.reviewer_ref AS reviewerRef,
    link.reviewed_at AS reviewedAt, link.updated_at AS updatedAt
  FROM story_learning_link AS link
  JOIN story_cluster AS story ON story.id = link.story_id
  LEFT JOIN article ON article.story_id = story.id AND article.deleted_at IS NULL
`;

export async function listLearningLinks(db: D1Database, status: string | null, limit = 100): Promise<LearningLinkSummary[]> {
  const allowed = new Set<ReviewStatus>(['suggested', 'approved', 'rejected', 'withdrawn', 'stale']);
  if (status && !allowed.has(status as ReviewStatus)) throw new Error('invalid_learning_review_status');
  const result = status
    ? await db.prepare(`${LEARNING_LINK_SELECT} WHERE link.review_status = ? ORDER BY link.relevance_score DESC, link.updated_at DESC LIMIT ?`)
      .bind(status, limit).all<Record<string, unknown>>()
    : await db.prepare(`${LEARNING_LINK_SELECT} ORDER BY CASE link.review_status WHEN 'suggested' THEN 0 ELSE 1 END, link.relevance_score DESC, link.updated_at DESC LIMIT ?`)
      .bind(limit).all<Record<string, unknown>>();
  return result.results.map(mapLearningLink);
}

export async function getStoryLearningLinks(db: D1Database, storyId: string): Promise<LearningLinkSummary[]> {
  const result = await db.prepare(`${LEARNING_LINK_SELECT} WHERE link.story_id = ? ORDER BY link.object_type, link.relevance_score DESC`)
    .bind(storyId).all<Record<string, unknown>>();
  return result.results.map(mapLearningLink);
}

function currentCatalogObject(catalog: LearningCatalog, objectType: 'skill' | 'course', id: string) {
  return objectType === 'skill'
    ? catalog.skills.find((item) => item.id === id)
    : catalog.courses.find((item) => item.id === id);
}

export async function reviewLearningLink(
  db: D1Database,
  linkId: string,
  input: { status: 'approved' | 'rejected' | 'withdrawn'; expectedUpdatedAt: string; reason: string; catalog: unknown },
  actorRef: string,
  traceId: string,
): Promise<'updated' | 'not_found' | 'conflict' | 'stale'> {
  const catalog = parseLearningCatalog(input.catalog);
  const link = await db.prepare(`
    SELECT * FROM story_learning_link WHERE id = ? LIMIT 1
  `).bind(linkId).first<Record<string, unknown>>();
  if (!link) return 'not_found';
  if (String(link.updated_at) !== input.expectedUpdatedAt) return 'conflict';
  const objectType = link.object_type as 'skill' | 'course';
  const catalogObject = currentCatalogObject(catalog, objectType, String(link.core_object_id));
  const nextStatus: ReviewStatus = catalogObject ? input.status : 'stale';
  const revision = await db.prepare(`
    SELECT COALESCE(MAX(revision_number), 0) AS value
    FROM learning_link_revision WHERE learning_link_id = ?
  `).bind(linkId).first<{ value: number }>();
  const now = new Date().toISOString();
  const article = await db.prepare(`
    SELECT id FROM article WHERE story_id = ? AND deleted_at IS NULL LIMIT 1
  `).bind(String(link.story_id)).first<{ id: string }>();
  const statements: D1PreparedStatement[] = [
    db.prepare(`
      UPDATE story_learning_link SET
        core_slug = ?, core_title = ?, core_url = ?, catalog_version = ?,
        catalog_checksum = ?, review_status = ?, reviewer_ref = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ? AND updated_at = ?
    `).bind(
      catalogObject?.slug ?? String(link.core_slug),
      objectType === 'skill'
        ? ((catalogObject as CatalogSkill | undefined)?.nameZh ?? String(link.core_title))
        : ((catalogObject as CatalogCourse | undefined)?.title ?? String(link.core_title)),
      catalogObject?.url ?? String(link.core_url), catalog.catalogVersion, catalog.checksum,
      nextStatus, actorRef, now, now, linkId, input.expectedUpdatedAt,
    ),
    db.prepare(`
      INSERT INTO learning_link_revision (
        id, learning_link_id, revision_number, review_status, relevance_score,
        catalog_version, actor_ref, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `learningrev_${crypto.randomUUID()}`, linkId, Number(revision?.value ?? 0) + 1,
      nextStatus, Number(link.relevance_score), catalog.catalogVersion, actorRef,
      catalogObject ? input.reason : 'Core object is no longer active in the current catalog',
    ),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        before_json, after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.learning.review', 'learning_link', ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, linkId,
      JSON.stringify({ status: link.review_status, catalogVersion: link.catalog_version }),
      JSON.stringify({ status: nextStatus, catalogVersion: catalog.catalogVersion }),
      input.reason, traceId,
    ),
  ];

  if (article) {
    if (nextStatus === 'approved' && objectType === 'skill') {
      statements.push(db.prepare(`
        INSERT INTO article_skill_link (
          article_id, skill_id, relationship_type, relevance_score, impact_type,
          evidence_excerpt, retrieval_version, model_version, prompt_version,
          review_status, locked, reviewer_ref, reviewed_at, updated_at
        ) VALUES (?, ?, 'applied', ?, 'practice', ?, ?, ?, ?, 'approved', 1, ?, ?, ?)
        ON CONFLICT(article_id, skill_id, relationship_type) DO UPDATE SET
          relevance_score = excluded.relevance_score,
          evidence_excerpt = excluded.evidence_excerpt,
          retrieval_version = excluded.retrieval_version,
          model_version = excluded.model_version,
          prompt_version = excluded.prompt_version,
          review_status = 'approved', locked = 1,
          reviewer_ref = excluded.reviewer_ref, reviewed_at = excluded.reviewed_at,
          updated_at = excluded.updated_at
      `).bind(
        article.id, String(link.core_object_id), Number(link.relevance_score),
        String(link.evidence_excerpt), String(link.retrieval_version),
        String(link.embedding_version), String(link.catalog_version), actorRef, now, now,
      ));
    } else if (nextStatus === 'approved' && objectType === 'course') {
      statements.push(db.prepare(`
        INSERT INTO article_course_link (
          article_id, course_id, relation_type, reason, evidence_excerpt,
          review_status, source_version
        ) VALUES (?, ?, 'learn_next', ?, ?, 'approved', ?)
        ON CONFLICT(article_id, course_id, relation_type) DO UPDATE SET
          reason = excluded.reason, evidence_excerpt = excluded.evidence_excerpt,
          review_status = 'approved', source_version = excluded.source_version
      `).bind(
        article.id, String(link.core_object_id), String(link.reason),
        String(link.evidence_excerpt), catalog.catalogVersion,
      ));
    } else if (objectType === 'skill') {
      statements.push(db.prepare(`
        DELETE FROM article_skill_link WHERE article_id = ? AND skill_id = ?
      `).bind(article.id, String(link.core_object_id)));
    } else {
      statements.push(db.prepare(`
        DELETE FROM article_course_link WHERE article_id = ? AND course_id = ?
      `).bind(article.id, String(link.core_object_id)));
    }
  }
  await db.batch(statements);
  return catalogObject ? 'updated' : 'stale';
}
