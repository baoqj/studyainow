import { sha256Hex } from '../ingestion/hash';
import {
  CLAIM_RESEARCH_GENERATOR_VERSION,
  CLAIM_RESEARCH_PROMPT_VERSION,
} from './prompts';

export type ClaimType = 'fact' | 'number' | 'quote' | 'prediction' | 'editorial_opinion' | 'inference';
export type ClaimSupport = 'supported' | 'conflicted' | 'unverified' | 'rejected';
export type ClaimRisk = 'normal' | 'high';
export type ClaimImportance = 'critical' | 'standard';

interface StorySourceRow {
  story_id: string;
  story_title: string;
  item_id: string;
  item_title: string;
  summary: string | null;
  source_url: string;
  published_at: string | null;
  relation_type: 'primary' | 'supporting' | 'conflicting' | 'duplicate';
  source_name: string;
  source_tier: 'A' | 'B' | 'C' | 'D';
}

export interface ClaimInput {
  claimText: string;
  claimType: ClaimType;
  supportStatus: ClaimSupport;
  riskLevel: ClaimRisk;
  importance: ClaimImportance;
  reason: string;
}

export interface EvidenceInput {
  itemId: string;
  evidenceExcerpt: string;
  isPrimary?: boolean;
}

function cleanExcerpt(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 2_000);
}

function atomicClaimText(source: StorySourceRow): string {
  const excerpt = cleanExcerpt(source.summary || source.item_title);
  const firstSentence = excerpt.split(/(?<=[.!?。！？])\s+/u)[0]?.trim();
  return (firstSentence && firstSentence.length >= 20 ? firstSentence : source.item_title).slice(0, 2_000);
}

function looksLikePromptInjection(value: string): boolean {
  return /(ignore (all |any )?(previous|prior) instructions?|system prompt|developer message|assistant\s*:|忽略.{0,12}(指令|提示)|系统提示)/iu.test(value);
}

function classifyTitle(title: string): { type: ClaimType; importance: ClaimImportance; risk: ClaimRisk } {
  if (/[“”"']/u.test(title)) return { type: 'quote', importance: 'critical', risk: 'high' };
  if (/\b\d+(?:[.,]\d+)?(?:%|x|×|b|m|k)?\b|\d{4}/iu.test(title)) {
    return { type: 'number', importance: 'critical', risk: 'high' };
  }
  return { type: 'fact', importance: 'standard', risk: 'normal' };
}

async function storySources(db: D1Database, storyId: string): Promise<StorySourceRow[]> {
  const rows = await db.prepare(`
    SELECT story.id AS story_id, story.canonical_title AS story_title,
      item.id AS item_id, item.title AS item_title, item.summary, item.source_url,
      item.published_at, link.relation_type, source.name AS source_name,
      source.trust_tier AS source_tier
    FROM story_cluster AS story
    JOIN story_source AS link ON link.story_id = story.id
    JOIN source_item AS item ON item.id = link.item_id
    JOIN news_source AS source ON source.id = item.source_id
    WHERE story.id = ?
    ORDER BY CASE link.relation_type
      WHEN 'primary' THEN 0 WHEN 'supporting' THEN 1
      WHEN 'conflicting' THEN 2 ELSE 3 END,
      COALESCE(item.published_at, item.discovered_at) DESC,
      item.id
  `).bind(storyId).all<StorySourceRow>();
  return rows.results;
}

function supportFor(source: StorySourceRow, excerpt: string): ClaimSupport {
  if (looksLikePromptInjection(`${source.item_title}\n${excerpt}`)) return 'unverified';
  if (source.relation_type === 'conflicting') return 'conflicted';
  if (excerpt && (source.source_tier === 'A' || source.source_tier === 'B')) return 'supported';
  return 'unverified';
}

export async function generateResearchPackage(
  db: D1Database,
  storyId: string,
  actorRef: string,
  traceId: string,
  idempotencyKey: string,
): Promise<{ packageId: string; reused: boolean; claimCount: number; status: 'ready' | 'needs_review' }> {
  const sources = await storySources(db, storyId);
  if (sources.length === 0) throw new Error('story_not_found');
  const inputHash = await sha256Hex(JSON.stringify(sources.map((source) => ({
    id: source.item_id,
    title: source.item_title,
    summary: source.summary,
    url: source.source_url,
    tier: source.source_tier,
    relation: source.relation_type,
  }))));
  const existing = await db.prepare(`
    SELECT id, claim_count, status FROM research_package
    WHERE story_id = ? AND input_hash = ? LIMIT 1
  `).bind(storyId, inputHash).first<{ id: string; claim_count: number; status: 'ready' | 'needs_review' }>();
  if (existing) {
    return { packageId: existing.id, reused: true, claimCount: existing.claim_count, status: existing.status };
  }

  const versionRow = await db.prepare(`
    SELECT COALESCE(MAX(version), 0) AS version FROM research_package WHERE story_id = ?
  `).bind(storyId).first<{ version: number }>();
  const packageId = `research_${crypto.randomUUID()}`;
  const version = Number(versionRow?.version ?? 0) + 1;
  const candidates = await Promise.all(sources.filter((source) => source.relation_type !== 'duplicate').map(async (source) => {
    const excerpt = cleanExcerpt(source.summary || source.item_title);
    const claimText = atomicClaimText(source);
    const classification = looksLikePromptInjection(`${source.item_title}\n${excerpt}`)
      ? { type: 'fact' as const, importance: 'critical' as const, risk: 'high' as const }
      : classifyTitle(claimText);
    return {
      source,
      excerpt,
      ...classification,
      support: supportFor(source, excerpt),
      claimId: `claim_${crypto.randomUUID()}`,
      claimText,
      evidenceHash: await sha256Hex(`${source.item_id}\n${excerpt}`),
    };
  }));
  const conflictCount = candidates.filter((candidate) => candidate.support === 'conflicted').length;
  const status = candidates.some((candidate) => candidate.support !== 'supported') ? 'needs_review' : 'ready';
  const workflowId = `workflow_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    db.prepare(`
      INSERT INTO research_package (
        id, story_id, version, status, source_count, claim_count, conflict_count,
        timeline_json, source_summary_json, input_hash, generator_version,
        prompt_version, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      packageId, storyId, version, status, sources.length, candidates.length, conflictCount,
      JSON.stringify(sources.map((source) => ({ itemId: source.item_id, publishedAt: source.published_at }))),
      JSON.stringify(sources.map((source) => ({ itemId: source.item_id, title: source.item_title, tier: source.source_tier }))),
      inputHash, CLAIM_RESEARCH_GENERATOR_VERSION, CLAIM_RESEARCH_PROMPT_VERSION, actorRef,
    ),
    ...sources.map((source) => db.prepare(`
      INSERT INTO research_package_source (
        package_id, item_id, source_url, source_tier, relation_type, evidence_excerpt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      packageId, source.item_id, source.source_url, source.source_tier,
      source.relation_type, cleanExcerpt(source.summary || source.item_title),
    )),
    ...candidates.flatMap((candidate) => [
      db.prepare(`
        INSERT INTO claim (
          id, story_id, claim_text, claim_type, support_status, risk_level,
          importance, locked, source_input_hash, checked_at, reviewer_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).bind(
        candidate.claimId, storyId,
        candidate.claimText,
        candidate.type, candidate.support, candidate.risk, candidate.importance,
        inputHash, candidate.support === 'supported' ? now : null,
        candidate.support === 'supported' ? 'system:source-bound-rules-v1' : null,
      ),
      db.prepare(`
        INSERT INTO claim_evidence (
          id, claim_id, item_id, source_url, evidence_excerpt, location_json,
          source_tier, evidence_hash, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `evidence_${crypto.randomUUID()}`, candidate.claimId, candidate.source.item_id,
        candidate.source.source_url, candidate.excerpt,
        JSON.stringify({ field: candidate.source.summary ? 'summary' : 'title' }),
        candidate.source.source_tier,
        candidate.evidenceHash,
        candidate.source.relation_type === 'primary' ? 1 : 0,
      ),
    ]),
    db.prepare(`
      INSERT INTO workflow_run (
        id, workflow_type, object_type, object_id, current_step, status,
        attempt, max_attempts, idempotency_key, model_version, prompt_version,
        input_hash, started_at, completed_at
      ) VALUES (?, 'research', 'story_cluster', ?, 'claim_ledger', 'succeeded',
        1, 1, ?, ?, ?, ?, ?, ?)
    `).bind(
      workflowId, storyId, idempotencyKey, CLAIM_RESEARCH_GENERATOR_VERSION,
      CLAIM_RESEARCH_PROMPT_VERSION, inputHash, now, now,
    ),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id, idempotency_key
      ) VALUES (?, ?, 'admin', 'news.research.generate', 'story_cluster', ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, storyId,
      JSON.stringify({ packageId, version, inputHash, claimCount: candidates.length, status }),
      'Generate source-bound research package', traceId, idempotencyKey,
    ),
  ];
  await db.batch(statements);
  return { packageId, reused: false, claimCount: candidates.length, status };
}

export async function getStoryResearch(db: D1Database, storyId: string): Promise<Record<string, unknown> | null> {
  const story = await db.prepare(`
    SELECT id, canonical_title AS title, occurred_at AS occurredAt,
      status, locked, created_at AS createdAt, updated_at AS updatedAt
    FROM story_cluster WHERE id = ? LIMIT 1
  `).bind(storyId).first<Record<string, unknown>>();
  if (!story) return null;
  const sources = await storySources(db, storyId);
  const researchPackage = await db.prepare(`
    SELECT id, version, status, source_count AS sourceCount, claim_count AS claimCount,
      conflict_count AS conflictCount, input_hash AS inputHash,
      generator_version AS generatorVersion, prompt_version AS promptVersion,
      created_by AS createdBy, created_at AS createdAt
    FROM research_package WHERE story_id = ? ORDER BY version DESC LIMIT 1
  `).bind(storyId).first<Record<string, unknown>>();
  const claims = await db.prepare(`
    SELECT id, claim_text AS claimText, claim_type AS claimType,
      support_status AS supportStatus, risk_level AS riskLevel, importance,
      locked, checked_at AS checkedAt, reviewer_ref AS reviewerRef,
      created_at AS createdAt, updated_at AS updatedAt
    FROM claim WHERE story_id = ? ORDER BY importance, created_at
  `).bind(storyId).all<Record<string, unknown>>();
  const evidence = await db.prepare(`
    SELECT evidence.id, evidence.claim_id AS claimId, evidence.item_id AS itemId,
      evidence.source_url AS sourceUrl, evidence.evidence_excerpt AS evidenceExcerpt,
      evidence.location_json AS locationJson, evidence.source_tier AS sourceTier,
      evidence.is_primary AS isPrimary, evidence.created_at AS createdAt
    FROM claim_evidence AS evidence
    JOIN claim ON claim.id = evidence.claim_id
    WHERE claim.story_id = ? ORDER BY evidence.is_primary DESC, evidence.created_at
  `).bind(storyId).all<Record<string, unknown>>();
  return {
    story,
    sources: sources.map((source) => ({
      itemId: source.item_id, sourceName: source.source_name, sourceTier: source.source_tier,
      title: source.item_title, summary: source.summary, url: source.source_url,
      publishedAt: source.published_at, relationType: source.relation_type,
    })),
    researchPackage,
    claims: claims.results,
    evidence: evidence.results.map((item) => ({
      ...item,
      locationJson: typeof item.locationJson === 'string' ? JSON.parse(item.locationJson) : item.locationJson,
      isPrimary: Number(item.isPrimary) === 1,
    })),
  };
}

export async function createClaim(
  db: D1Database,
  storyId: string,
  input: ClaimInput,
  actorRef: string,
  traceId: string,
): Promise<string> {
  const story = await db.prepare('SELECT id FROM story_cluster WHERE id = ?').bind(storyId).first<{ id: string }>();
  if (!story) throw new Error('story_not_found');
  if (input.supportStatus === 'supported') throw new Error('supported_claim_requires_evidence');
  const claimId = `claim_${crypto.randomUUID()}`;
  await db.batch([
    db.prepare(`
      INSERT INTO claim (
        id, story_id, claim_text, claim_type, support_status, risk_level,
        importance, locked, reviewer_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      claimId, storyId, input.claimText, input.claimType, input.supportStatus,
      input.riskLevel, input.importance, actorRef,
    ),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.claim.create', 'claim', ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), actorRef, claimId, JSON.stringify(input), input.reason, traceId),
  ]);
  return claimId;
}

export async function addClaimEvidence(
  db: D1Database,
  claimId: string,
  input: EvidenceInput,
  actorRef: string,
  traceId: string,
): Promise<string> {
  const row = await db.prepare(`
    SELECT claim.story_id, item.source_url, source.trust_tier,
      EXISTS(SELECT 1 FROM story_source WHERE story_id = claim.story_id AND item_id = item.id) AS belongs
    FROM claim
    JOIN source_item AS item ON item.id = ?
    JOIN news_source AS source ON source.id = item.source_id
    WHERE claim.id = ? LIMIT 1
  `).bind(input.itemId, claimId).first<{
    story_id: string; source_url: string; trust_tier: 'A' | 'B' | 'C' | 'D'; belongs: number;
  }>();
  if (!row || Number(row.belongs) !== 1) throw new Error('claim_or_story_source_not_found');
  const excerpt = cleanExcerpt(input.evidenceExcerpt);
  if (!excerpt) throw new Error('evidence_excerpt_required');
  const evidenceId = `evidence_${crypto.randomUUID()}`;
  await db.batch([
    db.prepare(`
      INSERT INTO claim_evidence (
        id, claim_id, item_id, source_url, evidence_excerpt, source_tier,
        evidence_hash, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      evidenceId, claimId, input.itemId, row.source_url, excerpt, row.trust_tier,
      await sha256Hex(`${input.itemId}\n${excerpt}`), input.isPrimary ? 1 : 0,
    ),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.claim.evidence.add', 'claim', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, claimId,
      JSON.stringify({ evidenceId, itemId: input.itemId }), 'Attach source evidence', traceId,
    ),
  ]);
  return evidenceId;
}

export async function updateClaim(
  db: D1Database,
  claimId: string,
  input: ClaimInput,
  actorRef: string,
  traceId: string,
): Promise<boolean> {
  const current = await db.prepare(`
    SELECT claim_text, claim_type, support_status, risk_level, importance
    FROM claim WHERE id = ? LIMIT 1
  `).bind(claimId).first<Record<string, unknown>>();
  if (!current) return false;
  if (input.supportStatus === 'supported') {
    const evidence = await db.prepare('SELECT COUNT(*) AS count FROM claim_evidence WHERE claim_id = ?')
      .bind(claimId).first<{ count: number }>();
    if (Number(evidence?.count ?? 0) === 0) throw new Error('supported_claim_requires_evidence');
  }
  const revision = await db.prepare(`
    SELECT COUNT(*) AS count FROM claim_revision WHERE claim_id = ?
  `).bind(claimId).first<{ count: number }>();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`
      INSERT INTO claim_revision (
        id, claim_id, revision_number, claim_text, claim_type, support_status,
        risk_level, importance, reviewer_ref, change_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `claimrev_${crypto.randomUUID()}`, claimId, Number(revision?.count ?? 0) + 1,
      input.claimText, input.claimType, input.supportStatus, input.riskLevel,
      input.importance, actorRef, input.reason,
    ),
    db.prepare(`
      UPDATE claim SET claim_text = ?, claim_type = ?, support_status = ?,
        risk_level = ?, importance = ?, locked = 1, checked_at = ?,
        reviewer_ref = ?, updated_at = ? WHERE id = ?
    `).bind(
      input.claimText, input.claimType, input.supportStatus, input.riskLevel,
      input.importance, now, actorRef, now, claimId,
    ),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        before_json, after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.claim.review', 'claim', ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), actorRef, claimId, JSON.stringify(current), JSON.stringify(input), input.reason, traceId),
  ]);
  return true;
}
