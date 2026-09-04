import type { Env } from '../env';
import { sha256Hex } from '../ingestion/hash';
import { hammingDistance, normalizedTitle, simHashHex, tokenJaccard } from './simhash';
import { CLASSIFIER_VERSION, classifyMetadata } from './taxonomy';

const DEDUPE_VERSION = 'simhash-v1';

interface PendingItemRow {
  id: string;
  source_id: string;
  title: string;
  summary: string | null;
  content_hash: string;
  published_at: string | null;
}

interface ClusterCandidateRow {
  story_id: string;
  story_locked: number;
  item_id: string;
  source_id: string;
  title: string;
  content_hash: string;
  simhash_hex: string;
  published_at: string | null;
}

export interface EnrichmentBatchResult {
  itemsProcessed: number;
  storiesCreated: number;
  itemsClustered: number;
  metadataUpdated: number;
  lockedStoriesSkipped: number;
  version: string;
}

export interface CandidateSummary {
  id: string;
  title: string;
  occurredAt: string | null;
  status: string;
  locked: boolean;
  sourceCount: number;
  maxQualityScore: number | null;
  category: { id: string; name: string; confidence: number; locked: boolean } | null;
  tags: Array<{ id: string; name: string; locked: boolean }>;
  entities: Array<{ id: string; name: string; locked: boolean }>;
  sources: Array<{
    id: string;
    sourceName: string;
    title: string;
    url: string;
    publishedAt: string | null;
    relationType: string;
    qualityScore: number | null;
  }>;
  articleId: string | null;
  articleStatus: string | null;
}

function withinDays(left: string | null, right: string | null, days: number): boolean {
  if (!left || !right) return true;
  const difference = Math.abs(Date.parse(left) - Date.parse(right));
  return Number.isFinite(difference) && difference <= days * 86_400_000;
}

function matchScore(item: PendingItemRow, simhash: string, candidate: ClusterCandidateRow): number {
  if (item.content_hash === candidate.content_hash) return 1;
  if (!withinDays(item.published_at, candidate.published_at, 14)) return 0;
  if (normalizedTitle(item.title) === normalizedTitle(candidate.title)) return 0.99;
  const distance = hammingDistance(simhash, candidate.simhash_hex);
  const jaccard = tokenJaccard(item.title, candidate.title);
  if (distance > 8 || jaccard < 0.62) return 0;
  return Math.min(0.98, 0.72 + (8 - distance) * 0.02 + jaccard * 0.1);
}

async function findMatchingStory(
  db: D1Database,
  item: PendingItemRow,
  simhash: string,
): Promise<{ storyId: string; relationType: 'duplicate' | 'supporting'; confidence: number } | null> {
  const candidates = await db.prepare(`
    SELECT
      story.id AS story_id,
      story.locked AS story_locked,
      item.id AS item_id,
      item.source_id,
      item.title,
      item.content_hash,
      item.simhash_hex,
      item.published_at
    FROM story_cluster AS story
    JOIN story_source AS link ON link.story_id = story.id
    JOIN source_item AS item ON item.id = link.item_id
    WHERE story.status <> 'archived'
      AND story.locked = 0
      AND item.simhash_hex IS NOT NULL
    ORDER BY COALESCE(item.published_at, item.discovered_at) DESC
    LIMIT 400
  `).all<ClusterCandidateRow>();

  let best: { row: ClusterCandidateRow; score: number } | null = null;
  for (const candidate of candidates.results) {
    if (candidate.item_id === item.id) continue;
    const score = matchScore(item, simhash, candidate);
    if (score > (best?.score ?? 0)) best = { row: candidate, score };
  }
  if (!best) return null;
  return {
    storyId: best.row.story_id,
    relationType: item.content_hash === best.row.content_hash ? 'duplicate' : 'supporting',
    confidence: best.score,
  };
}

async function currentStoryText(db: D1Database, storyId: string): Promise<{ title: string; summary: string }> {
  const rows = await db.prepare(`
    SELECT item.title, COALESCE(item.summary, '') AS summary, link.relation_type
    FROM story_source AS link
    JOIN source_item AS item ON item.id = link.item_id
    WHERE link.story_id = ?
    ORDER BY CASE link.relation_type WHEN 'primary' THEN 0 ELSE 1 END,
      COALESCE(item.quality_score, 0) DESC
  `).bind(storyId).all<{ title: string; summary: string; relation_type: string }>();
  const primary = rows.results[0];
  return {
    title: primary?.title ?? '',
    summary: rows.results.map((row) => row.summary).filter(Boolean).join('\n').slice(0, 8000),
  };
}

async function appendMetadataRevision(
  db: D1Database,
  storyId: string,
  actorRef: string,
  source: 'automatic' | 'human',
  reason: string,
  confidence: number,
  classifierVersion: string,
): Promise<void> {
  const primary = await db.prepare(`
    SELECT taxonomy.id, taxonomy.name
    FROM story_taxonomy AS link
    JOIN taxonomy_node AS taxonomy ON taxonomy.id = link.taxonomy_id
    WHERE link.story_id = ? AND link.relation_type = 'primary'
    LIMIT 1
  `).bind(storyId).first<{ id: string; name: string }>();
  const tags = await db.prepare(`
    SELECT taxonomy.id, taxonomy.name
    FROM story_taxonomy AS link
    JOIN taxonomy_node AS taxonomy ON taxonomy.id = link.taxonomy_id
    WHERE link.story_id = ? AND link.relation_type = 'tag'
    ORDER BY taxonomy.name
  `).bind(storyId).all<{ id: string; name: string }>();
  const entities = await db.prepare(`
    SELECT entity.id, entity.canonical_name AS name
    FROM story_entity AS link
    JOIN entity ON entity.id = link.entity_id
    WHERE link.story_id = ?
    ORDER BY entity.canonical_name
  `).bind(storyId).all<{ id: string; name: string }>();
  const count = await db.prepare(`
    SELECT COUNT(*) AS count FROM story_metadata_revision WHERE story_id = ?
  `).bind(storyId).first<{ count: number }>();

  await db.prepare(`
    INSERT INTO story_metadata_revision (
      id, story_id, revision_number, primary_category_id, tags_json, entities_json,
      confidence, classifier_version, change_source, actor_ref, change_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    `storymeta_${crypto.randomUUID()}`,
    storyId,
    Number(count?.count ?? 0) + 1,
    primary?.id ?? null,
    JSON.stringify(tags.results),
    JSON.stringify(entities.results),
    confidence,
    classifierVersion,
    source,
    actorRef,
    reason,
  ).run();
}

async function automaticallyClassifyStory(db: D1Database, storyId: string): Promise<'updated' | 'locked'> {
  const story = await db.prepare('SELECT locked FROM story_cluster WHERE id = ?')
    .bind(storyId)
    .first<{ locked: number }>();
  if (!story || story.locked === 1) return 'locked';

  const text = await currentStoryText(db, storyId);
  const metadata = classifyMetadata(text.title, text.summary);
  const lockedPrimary = await db.prepare(`
    SELECT 1 AS present FROM story_taxonomy
    WHERE story_id = ? AND relation_type = 'primary' AND locked = 1
    LIMIT 1
  `).bind(storyId).first<{ present: number }>();

  await db.prepare('DELETE FROM story_taxonomy WHERE story_id = ? AND locked = 0').bind(storyId).run();
  await db.prepare('DELETE FROM story_entity WHERE story_id = ? AND locked = 0').bind(storyId).run();

  if (!lockedPrimary) {
    await db.prepare(`
      INSERT INTO story_taxonomy (
        story_id, taxonomy_id, relation_type, confidence, evidence_excerpt, locked, source_version
      ) VALUES (?, ?, 'primary', ?, ?, 0, ?)
    `).bind(
      storyId,
      metadata.categoryId,
      metadata.categoryConfidence,
      metadata.categoryEvidence,
      CLASSIFIER_VERSION,
    ).run();
  }

  for (const tag of metadata.tags) {
    await db.prepare(`
      INSERT INTO story_taxonomy (
        story_id, taxonomy_id, relation_type, confidence, evidence_excerpt, locked, source_version
      ) VALUES (?, ?, 'tag', ?, ?, 0, ?)
      ON CONFLICT(story_id, taxonomy_id, relation_type) DO NOTHING
    `).bind(storyId, tag.id, tag.confidence, tag.evidence, CLASSIFIER_VERSION).run();
  }
  for (const entity of metadata.entities) {
    await db.prepare(`
      INSERT INTO story_entity (
        story_id, entity_id, evidence_excerpt, confidence, locked, source_version
      ) VALUES (?, ?, ?, ?, 0, ?)
      ON CONFLICT(story_id, entity_id) DO NOTHING
    `).bind(storyId, entity.id, entity.evidence, entity.confidence, CLASSIFIER_VERSION).run();
  }

  await appendMetadataRevision(
    db,
    storyId,
    'system:taxonomy-rules',
    'automatic',
    'Automated P0-3 classification',
    metadata.categoryConfidence,
    CLASSIFIER_VERSION,
  );
  await db.prepare(`
    UPDATE story_cluster SET status = 'enriched', updated_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), storyId).run();
  return 'updated';
}

export async function processCandidateBatch(env: Env, limit = 60): Promise<EnrichmentBatchResult> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const pending = await env.DB.prepare(`
    SELECT item.id, item.source_id, item.title, item.summary, item.content_hash, item.published_at
    FROM source_item AS item
    WHERE item.processing_status = 'normalized'
      AND NOT EXISTS (SELECT 1 FROM story_source WHERE item_id = item.id)
    ORDER BY COALESCE(item.quality_score, 0) DESC, item.discovered_at
    LIMIT ?
  `).bind(safeLimit).all<PendingItemRow>();

  const result: EnrichmentBatchResult = {
    itemsProcessed: 0,
    storiesCreated: 0,
    itemsClustered: 0,
    metadataUpdated: 0,
    lockedStoriesSkipped: 0,
    version: `${DEDUPE_VERSION}+${CLASSIFIER_VERSION}`,
  };
  const changedStories = new Set<string>();

  for (const item of pending.results) {
    const simhash = simHashHex(item.title);
    await env.DB.prepare(`
      UPDATE source_item SET simhash_hex = ?, dedupe_version = ?, updated_at = ? WHERE id = ?
    `).bind(simhash, DEDUPE_VERSION, new Date().toISOString(), item.id).run();
    const match = await findMatchingStory(env.DB, item, simhash);
    let storyId: string;
    let relationType: 'primary' | 'duplicate' | 'supporting';
    let confidence: number;

    if (match) {
      storyId = match.storyId;
      relationType = match.relationType;
      confidence = match.confidence;
      result.itemsClustered += 1;
    } else {
      const duplicateKey = `${DEDUPE_VERSION}:${await sha256Hex(normalizedTitle(item.title))}`;
      storyId = `story_${crypto.randomUUID()}`;
      const inserted = await env.DB.prepare(`
        INSERT OR IGNORE INTO story_cluster (
          id, canonical_title, occurred_at, status, duplicate_key
        ) VALUES (?, ?, ?, 'clustered', ?)
      `).bind(storyId, item.title, item.published_at, duplicateKey).run();
      if (Number(inserted.meta.changes ?? 0) === 0) {
        const existing = await env.DB.prepare('SELECT id FROM story_cluster WHERE duplicate_key = ? LIMIT 1')
          .bind(duplicateKey)
          .first<{ id: string }>();
        if (!existing) throw new Error('story_cluster_race');
        storyId = existing.id;
        relationType = 'duplicate';
        confidence = 0.99;
        result.itemsClustered += 1;
      } else {
        relationType = 'primary';
        confidence = 1;
        result.storiesCreated += 1;
      }
    }

    await env.DB.prepare(`
      INSERT OR IGNORE INTO story_source (story_id, item_id, relation_type, confidence)
      VALUES (?, ?, ?, ?)
    `).bind(storyId, item.id, relationType, confidence).run();
    await env.DB.prepare(`
      UPDATE source_item SET processing_status = 'clustered', updated_at = ? WHERE id = ?
    `).bind(new Date().toISOString(), item.id).run();
    changedStories.add(storyId);
    result.itemsProcessed += 1;
  }

  for (const storyId of changedStories) {
    const status = await automaticallyClassifyStory(env.DB, storyId);
    if (status === 'locked') result.lockedStoriesSkipped += 1;
    else result.metadataUpdated += 1;
  }
  return result;
}

export async function listCandidates(db: D1Database, limit = 50): Promise<CandidateSummary[]> {
  const rows = await db.prepare(`
    SELECT
      story.id,
      story.canonical_title,
      story.occurred_at,
      story.status,
      story.locked,
      COUNT(DISTINCT link.item_id) AS source_count,
      MAX(item.quality_score) AS max_quality_score,
      article.id AS article_id,
      article.status AS article_status
    FROM story_cluster AS story
    JOIN story_source AS link ON link.story_id = story.id
    JOIN source_item AS item ON item.id = link.item_id
    LEFT JOIN article ON article.story_id = story.id AND article.deleted_at IS NULL
    WHERE story.status <> 'archived'
    GROUP BY story.id
    ORDER BY COALESCE(story.occurred_at, story.created_at) DESC
    LIMIT ?
  `).bind(limit).all<{
    id: string;
    canonical_title: string;
    occurred_at: string | null;
    status: string;
    locked: number;
    source_count: number;
    max_quality_score: number | null;
    article_id: string | null;
    article_status: string | null;
  }>();

  const output: CandidateSummary[] = [];
  for (const row of rows.results) {
    const taxonomy = await db.prepare(`
      SELECT node.id, node.name, link.relation_type, link.confidence, link.locked
      FROM story_taxonomy AS link
      JOIN taxonomy_node AS node ON node.id = link.taxonomy_id
      WHERE link.story_id = ?
      ORDER BY link.relation_type, node.name
    `).bind(row.id).all<{ id: string; name: string; relation_type: string; confidence: number; locked: number }>();
    const entities = await db.prepare(`
      SELECT entity.id, entity.canonical_name AS name, link.locked
      FROM story_entity AS link
      JOIN entity ON entity.id = link.entity_id
      WHERE link.story_id = ?
      ORDER BY entity.canonical_name
    `).bind(row.id).all<{ id: string; name: string; locked: number }>();
    const sources = await db.prepare(`
      SELECT item.id, source.name AS source_name, item.title, item.canonical_url,
        item.published_at, link.relation_type, item.quality_score
      FROM story_source AS link
      JOIN source_item AS item ON item.id = link.item_id
      JOIN news_source AS source ON source.id = item.source_id
      WHERE link.story_id = ?
      ORDER BY CASE link.relation_type WHEN 'primary' THEN 0 ELSE 1 END,
        COALESCE(item.quality_score, 0) DESC
    `).bind(row.id).all<{
      id: string;
      source_name: string;
      title: string;
      canonical_url: string;
      published_at: string | null;
      relation_type: string;
      quality_score: number | null;
    }>();
    const category = taxonomy.results.find((item) => item.relation_type === 'primary');
    output.push({
      id: row.id,
      title: row.canonical_title,
      occurredAt: row.occurred_at,
      status: row.status,
      locked: row.locked === 1,
      sourceCount: Number(row.source_count),
      maxQualityScore: row.max_quality_score,
      category: category ? {
        id: category.id,
        name: category.name,
        confidence: category.confidence,
        locked: category.locked === 1,
      } : null,
      tags: taxonomy.results.filter((item) => item.relation_type === 'tag').map((item) => ({
        id: item.id,
        name: item.name,
        locked: item.locked === 1,
      })),
      entities: entities.results.map((item) => ({ id: item.id, name: item.name, locked: item.locked === 1 })),
      sources: sources.results.map((item) => ({
        id: item.id,
        sourceName: item.source_name,
        title: item.title,
        url: item.canonical_url,
        publishedAt: item.published_at,
        relationType: item.relation_type,
        qualityScore: item.quality_score,
      })),
      articleId: row.article_id,
      articleStatus: row.article_status,
    });
  }
  return output;
}

export async function updateStoryMetadata(
  db: D1Database,
  storyId: string,
  input: { categoryId: string; tagIds: string[]; locked: boolean; reason: string },
  actorRef: string,
  traceId: string,
): Promise<boolean> {
  const story = await db.prepare('SELECT id FROM story_cluster WHERE id = ? LIMIT 1')
    .bind(storyId)
    .first<{ id: string }>();
  if (!story) return false;
  const category = await db.prepare(`
    SELECT id FROM taxonomy_node
    WHERE id = ? AND taxonomy_type = 'category' AND status = 'active'
  `).bind(input.categoryId).first<{ id: string }>();
  if (!category) throw new Error('invalid_category_id');
  for (const tagId of input.tagIds) {
    const tag = await db.prepare(`
      SELECT id FROM taxonomy_node WHERE id = ? AND taxonomy_type = 'tag' AND status = 'active'
    `).bind(tagId).first<{ id: string }>();
    if (!tag) throw new Error('invalid_tag_id');
  }

  const before = await db.prepare(`
    SELECT taxonomy_id, relation_type, locked FROM story_taxonomy WHERE story_id = ?
  `).bind(storyId).all<{ taxonomy_id: string; relation_type: string; locked: number }>();
  await db.prepare('DELETE FROM story_taxonomy WHERE story_id = ?').bind(storyId).run();
  await db.prepare(`
    INSERT INTO story_taxonomy (
      story_id, taxonomy_id, relation_type, confidence, evidence_excerpt, locked, source_version
    ) VALUES (?, ?, 'primary', 1, 'human editorial selection', ?, 'human')
  `).bind(storyId, input.categoryId, input.locked ? 1 : 0).run();
  for (const tagId of input.tagIds) {
    await db.prepare(`
      INSERT INTO story_taxonomy (
        story_id, taxonomy_id, relation_type, confidence, evidence_excerpt, locked, source_version
      ) VALUES (?, ?, 'tag', 1, 'human editorial selection', ?, 'human')
    `).bind(storyId, tagId, input.locked ? 1 : 0).run();
  }
  await db.prepare(`
    UPDATE story_cluster SET locked = ?, updated_at = ? WHERE id = ?
  `).bind(input.locked ? 1 : 0, new Date().toISOString(), storyId).run();
  await appendMetadataRevision(db, storyId, actorRef, 'human', input.reason, 1, 'human');
  await db.prepare(`
    INSERT INTO audit_log (
      id, actor_ref, actor_role, action, object_type, object_id,
      before_json, after_json, reason, trace_id
    ) VALUES (?, ?, 'admin', 'news.story.metadata.update', 'story_cluster', ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    actorRef,
    storyId,
    JSON.stringify(before.results),
    JSON.stringify({ categoryId: input.categoryId, tagIds: input.tagIds, locked: input.locked }),
    input.reason,
    traceId,
  ).run();
  return true;
}
