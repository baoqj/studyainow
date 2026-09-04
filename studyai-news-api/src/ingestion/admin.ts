import { isAdminBearerAuthorized } from '../admin/auth';
import type { Env } from '../env';
import { PARSER_VERSION } from './feed-parser';
import { probeSourceFeed } from './probe';
import { listSourceHealth } from './repository';
import { runManualIngestion } from './service';
import type { SourceType, TrustTier } from './types';
import { isBlockedHostname, validateAllowedTarget } from './url';

export function isIngestionAdminAuthorized(request: Request, env: Env): boolean {
  return isAdminBearerAuthorized(request, env);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_json_body');
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string, maximum = 500): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new Error(`invalid_${field}`);
  }
  return value;
}

function optionalString(value: unknown, field: string, maximum = 500): string | null {
  if (value === undefined || value === null) return null;
  return string(value, field, maximum);
}

function integer(value: unknown, field: string, minimum: number, maximum: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`invalid_${field}`);
  }
  return parsed;
}

function sourceType(value: unknown): SourceType {
  if (value !== 'rss' && value !== 'atom') throw new Error('invalid_source_type');
  return value;
}

function trustTier(value: unknown): TrustTier {
  if (!['A', 'B', 'C', 'D'].includes(String(value))) throw new Error('invalid_trust_tier');
  return value as TrustTier;
}

function allowedHosts(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 5) {
    throw new Error('invalid_allowed_hosts');
  }
  const hosts = value.map((host) => string(host, 'allowed_host', 253).toLowerCase().replace(/\.$/, ''));
  if (new Set(hosts).size !== hosts.length || hosts.some(isBlockedHostname)) {
    throw new Error('invalid_allowed_hosts');
  }
  return hosts;
}

export async function probeSourceRequest(request: Request): Promise<unknown> {
  const body = record(await request.json());
  return probeSourceFeed({
    feedUrl: string(body.feedUrl, 'feed_url', 1000),
    allowedHosts: allowedHosts(body.allowedHosts),
    sourceType: sourceType(body.sourceType),
    trustTier: trustTier(body.trustTier),
    language: string(body.language, 'language', 35),
    maxItemsPerPoll: body.maxItemsPerPoll === undefined
      ? 20
      : integer(body.maxItemsPerPoll, 'max_items_per_poll', 1, 20),
  });
}

export async function createSource(env: Env, request: Request, traceId: string): Promise<string> {
  const body = record(await request.json());
  const id = string(body.id, 'source_id', 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('invalid_source_id');
  const hosts = allowedHosts(body.allowedHosts);
  const feedUrl = validateAllowedTarget(string(body.feedUrl, 'feed_url', 1000), hosts).toString();
  const homepageUrl = validateAllowedTarget(string(body.homepageUrl, 'homepage_url', 1000), hosts).toString();
  const type = sourceType(body.sourceType);
  const tier = trustTier(body.trustTier);
  const now = new Date().toISOString();

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO news_source (
        id, name, base_url, source_type, trust_tier, language, schedule_cron,
        parser_key, terms_note, full_text_authorized, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'paused')
    `).bind(
      id,
      string(body.name, 'name', 200),
      homepageUrl,
      type,
      tier,
      string(body.language, 'language', 35),
      optionalString(body.scheduleCron, 'schedule_cron', 80),
      PARSER_VERSION,
      string(body.termsNote, 'terms_note', 2000),
    ),
    env.DB.prepare(`
      INSERT INTO source_ingestion_policy (
        source_id, fetch_url, allowed_hosts_json, policy_status, robots_status,
        allow_html_fetch, max_response_bytes, max_items_per_poll,
        min_poll_interval_seconds, retention_policy
      ) VALUES (?, ?, ?, 'review_required', 'unknown', 0, ?, ?, ?, 'private_feed_snapshot')
    `).bind(
      id,
      feedUrl,
      JSON.stringify(hosts),
      integer(body.maxResponseBytes ?? 1048576, 'max_response_bytes', 1024, 1048576),
      integer(body.maxItemsPerPoll ?? 20, 'max_items_per_poll', 1, 20),
      integer(body.minPollIntervalSeconds ?? 3600, 'min_poll_interval_seconds', 900, 86400),
    ),
    env.DB.prepare(`
      INSERT INTO source_cursor (id, source_id, cursor_key) VALUES (?, ?, 'main')
    `).bind(`cursor:${id}`, id),
    env.DB.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, 'operator:ingest-admin', 'admin', 'news.source.create', 'news_source', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      id,
      JSON.stringify({ id, feedUrl, hosts, status: 'paused', policyStatus: 'review_required' }),
      'P0-2 source created pending policy approval',
      traceId,
    ),
  ]);
  return id;
}

export async function updateSource(
  env: Env,
  sourceId: string,
  request: Request,
  traceId: string,
): Promise<boolean> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sourceId)) throw new Error('invalid_source_id');
  const body = record(await request.json());
  const status = body.status === undefined ? null : string(body.status, 'status', 20);
  if (status !== null && !['active', 'paused', 'retired'].includes(status)) throw new Error('invalid_status');
  const policyStatus = body.policyStatus === undefined
    ? null
    : string(body.policyStatus, 'policy_status', 30);
  if (policyStatus !== null && !['review_required', 'approved', 'blocked'].includes(policyStatus)) {
    throw new Error('invalid_policy_status');
  }
  const robotsStatus = body.robotsStatus === undefined
    ? null
    : string(body.robotsStatus, 'robots_status', 20);
  if (robotsStatus !== null && !['unknown', 'allowed', 'disallowed', 'error'].includes(robotsStatus)) {
    throw new Error('invalid_robots_status');
  }
  const policyReviewedAt = optionalString(body.policyReviewedAt, 'policy_reviewed_at', 50);
  const nextPolicyReviewAt = optionalString(body.nextPolicyReviewAt, 'next_policy_review_at', 50);
  const now = new Date().toISOString();

  const existing = await env.DB.prepare('SELECT id FROM news_source WHERE id = ? LIMIT 1')
    .bind(sourceId)
    .first<{ id: string }>();
  if (!existing) return false;

  const result = await env.DB.batch([
    env.DB.prepare(`
      UPDATE source_ingestion_policy SET
        policy_status = COALESCE(?, policy_status),
        robots_status = COALESCE(?, robots_status),
        policy_reviewed_at = COALESCE(?, policy_reviewed_at),
        next_policy_review_at = COALESCE(?, next_policy_review_at),
        updated_at = ?
      WHERE source_id = ?
    `).bind(policyStatus, robotsStatus, policyReviewedAt, nextPolicyReviewAt, now, sourceId),
    env.DB.prepare(`
      UPDATE news_source SET
        status = COALESCE(?, status),
        schedule_cron = COALESCE(?, schedule_cron),
        updated_at = ?
      WHERE id = ?
    `).bind(status, optionalString(body.scheduleCron, 'schedule_cron', 80), now, sourceId),
    env.DB.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, 'operator:ingest-admin', 'admin', 'news.source.update', 'news_source', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      sourceId,
      JSON.stringify({ status, policyStatus, robotsStatus, policyReviewedAt, nextPolicyReviewAt }),
      optionalString(body.reason, 'reason', 1000) ?? 'P0-2 source configuration update',
      traceId,
    ),
  ]);

  return result.slice(0, 2).some((entry) => Number(entry.meta.changes ?? 0) > 0);
}

export async function retireSource(env: Env, sourceId: string, traceId: string): Promise<boolean> {
  const request = new Request('https://internal.invalid', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'retired', reason: 'Soft-retired through source API' }),
    headers: { 'content-type': 'application/json' },
  });
  return updateSource(env, sourceId, request, traceId);
}

export { listSourceHealth, runManualIngestion };
