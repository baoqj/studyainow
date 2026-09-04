import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { ARTICLE_STATUS_TRANSITIONS } from '../src/domain/article-status';
import { NEWS_SCHEMA_VERSION } from '../src/schema-health';

const migrationsDirectory = fileURLToPath(new URL('../migrations', import.meta.url));
const migrations = readdirSync(migrationsDirectory)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort()
  .map((file) => ({
    file,
    sql: readFileSync(`${migrationsDirectory}/${file}`, 'utf8'),
  }));

let database: DatabaseSync | null = null;

function openDatabase(): DatabaseSync {
  database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  return database;
}

function applyMigrations(db: DatabaseSync, start = 0, end = migrations.length): void {
  for (const migration of migrations.slice(start, end)) {
    db.exec(migration.sql);
  }
}

afterEach(() => {
  database?.close();
  database = null;
});

describe('News D1 migrations', () => {
  it('replays every migration from 0001 into an empty database', () => {
    expect(migrations.map(({ file }) => file)).toEqual([
      '0001_news_content_schema.sql',
      '0002_article_state_machine.sql',
      '0003_ingestion_runtime.sql',
      '0004_seed_p0_sources.sql',
      '0005_parser_reprocessing.sql',
      '0006_editorial_metadata.sql',
    ]);

    const db = openDatabase();
    applyMigrations(db, 0, 1);
    expect(
      db.prepare("SELECT value FROM schema_metadata WHERE key = 'news_schema_version'")
        .get(),
    ).toEqual({ value: '1' });

    applyMigrations(db, 1);

    const schemaVersion = db
      .prepare("SELECT value FROM schema_metadata WHERE key = 'news_schema_version'")
      .get() as { value: string };
    expect(Number(schemaVersion.value)).toBe(NEWS_SCHEMA_VERSION);

    const tables = db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row) => String(row.name));

    expect(tables).toEqual(expect.arrayContaining([
      'news_source',
      'source_cursor',
      'source_item',
      'source_snapshot',
      'story_cluster',
      'story_source',
      'claim',
      'claim_evidence',
      'article',
      'article_locale',
      'article_revision',
      'article_approval',
      'article_claim',
      'taxonomy_node',
      'article_taxonomy',
      'entity',
      'article_entity',
      'article_skill_link',
      'article_knowledge_link',
      'article_course_link',
      'skill_candidate',
      'embedding_manifest',
      'workflow_run',
      'workflow_step_attempt',
      'idempotency_record',
      'audit_log',
      'article_publication_event',
      'media_asset',
      'podcast_episode',
      'podcast_script',
      'episode_chapter',
      'transcript_segment',
      'article_status_transition',
      'source_ingestion_policy',
      'source_fetch_run',
      'source_feed_snapshot',
      'story_metadata_revision',
      'story_taxonomy',
      'story_entity',
    ]));

    for (const forbiddenTable of ['users', 'organizations', 'skills', 'courses', 'knowledge_points']) {
      expect(tables).not.toContain(forbiddenTable);
    }

    const indexes = db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row) => String(row.name));

    expect(indexes).toEqual(expect.arrayContaining([
      'idx_source_item_status_discovered',
      'idx_story_cluster_status_occurred',
      'idx_claim_story_support',
      'idx_article_status_schedule',
      'idx_article_revision_article_created',
      'idx_article_skill_link_review',
      'idx_workflow_run_status_created',
      'idx_audit_log_object_created',
      'idx_transcript_segment_episode_time',
      'idx_source_ingestion_policy_status',
      'idx_source_fetch_run_status_started',
      'idx_source_feed_snapshot_source_fetched',
      'idx_source_item_simhash',
      'idx_story_metadata_revision_story_created',
      'idx_story_taxonomy_one_primary',
    ]));

    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('seeds ten approved feed-only sources without enabling HTML crawling', () => {
    const db = openDatabase();
    applyMigrations(db);

    expect(db.prepare(`
      SELECT COUNT(*) AS count
      FROM news_source AS source
      JOIN source_ingestion_policy AS policy ON policy.source_id = source.id
      WHERE source.status = 'active'
        AND source.parser_key = 'rss_atom_v2'
        AND policy.policy_status = 'approved'
        AND policy.robots_status = 'allowed'
        AND policy.allow_html_fetch = 0
    `).get()).toEqual({ count: 10 });

    expect(db.prepare(`
      SELECT COUNT(*) AS count
      FROM source_ingestion_policy
      WHERE max_response_bytes > 1048576 OR max_items_per_poll > 20
    `).get()).toEqual({ count: 0 });

    expect(() => db.prepare(`
      INSERT INTO source_ingestion_policy (
        source_id, fetch_url, allowed_hosts_json, policy_status, robots_status,
        policy_reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'openai-news',
      'https://openai.com/invalid.xml',
      '["openai.com"]',
      'approved',
      'disallowed',
      '2026-09-03T00:00:00.000Z',
    )).toThrow();
  });

  it('keeps the SQL transition table synchronized with the application contract', () => {
    const db = openDatabase();
    applyMigrations(db);

    const sqlTransitions = db
      .prepare(`
        SELECT from_status, to_status, requires_human_approval
        FROM article_status_transition
        ORDER BY from_status, to_status
      `)
      .all()
      .map((row) => ({
        from: String(row.from_status),
        to: String(row.to_status),
        requiresHumanApproval: Number(row.requires_human_approval) === 1,
      }));

    const applicationTransitions = [...ARTICLE_STATUS_TRANSITIONS]
      .sort((left, right) => `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`));

    expect(sqlTransitions).toEqual(applicationTransitions);
  });

  it('rejects illegal publication transitions and requires a human publisher approval', () => {
    const db = openDatabase();
    applyMigrations(db);

    db.prepare(`
      INSERT INTO story_cluster (id, canonical_title)
      VALUES (?, ?)
    `).run('story-1', 'Foundation test story');

    expect(() => db.prepare(`
      INSERT INTO article (id, story_id, article_type, status)
      VALUES (?, ?, ?, ?)
    `).run('article-invalid', 'story-1', 'brief', 'published')).toThrow(/article must start in draft/);

    db.prepare(`
      INSERT INTO article (id, story_id, article_type)
      VALUES (?, ?, ?)
    `).run('article-1', 'story-1', 'deep_dive');

    expect(() => db.prepare(`
      UPDATE article SET status = 'published' WHERE id = ?
    `).run('article-1')).toThrow(/invalid article status transition/);

    db.prepare(`
      INSERT INTO article_revision (
        id, article_id, revision_number, locale, title, summary,
        body_markdown, change_reason, editor_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'revision-1',
      'article-1',
      1,
      'zh-CN',
      'Test title',
      'Test summary',
      '# Test body',
      'Initial draft',
      'actor:editor-1',
    );

    db.prepare(`
      UPDATE article
      SET active_revision_id = ?, published_revision_id = ?
      WHERE id = ?
    `).run('revision-1', 'revision-1', 'article-1');

    db.prepare("UPDATE article SET status = 'in_review' WHERE id = ?").run('article-1');

    expect(() => db.prepare(`
      UPDATE article SET status = 'published' WHERE id = ?
    `).run('article-1')).toThrow(/publisher approval required/);

    db.prepare(`
      INSERT INTO article_approval (id, revision_id, actor_ref, actor_role, decision)
      VALUES (?, ?, ?, ?, ?)
    `).run('approval-editor', 'revision-1', 'actor:editor-2', 'editor', 'approved');

    expect(() => db.prepare(`
      UPDATE article SET status = 'published' WHERE id = ?
    `).run('article-1')).toThrow(/publisher approval required/);

    db.prepare(`
      INSERT INTO article_approval (id, revision_id, actor_ref, actor_role, decision)
      VALUES (?, ?, ?, ?, ?)
    `).run('approval-publisher', 'revision-1', 'actor:publisher-1', 'publisher', 'approved');

    db.prepare("UPDATE article SET status = 'published' WHERE id = ?").run('article-1');
    expect(db.prepare('SELECT status FROM article WHERE id = ?').get('article-1')).toEqual({
      status: 'published',
    });

    expect(() => db.prepare(`
      UPDATE article SET status = 'draft' WHERE id = ?
    `).run('article-1')).toThrow(/invalid article status transition/);

    expect(() => db.prepare(`
      UPDATE article_revision SET title = ? WHERE id = ?
    `).run('Mutated title', 'revision-1')).toThrow(/article revisions are immutable/);
  });

  it('enforces canonical-ID-only links, short evidence and append-only audit records', () => {
    const db = openDatabase();
    applyMigrations(db);

    db.prepare(`
      INSERT INTO article (id, article_type) VALUES (?, ?)
    `).run('article-2', 'brief');

    db.prepare(`
      INSERT INTO article_skill_link (
        article_id, skill_id, relationship_type, relevance_score,
        impact_type, evidence_excerpt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run('article-2', 'core-skill-id-123', 'applied', 0.91, 'practice', 'Short evidence');

    expect(db.prepare(`
      SELECT skill_id FROM article_skill_link WHERE article_id = ?
    `).get('article-2')).toEqual({ skill_id: 'core-skill-id-123' });

    expect(() => db.prepare(`
      INSERT INTO article_skill_link (
        article_id, skill_id, relationship_type, relevance_score,
        impact_type, evidence_excerpt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run('missing-article', 'core-skill-id-456', 'applied', 0.5, 'monitor', 'Evidence'))
      .toThrow(/FOREIGN KEY constraint failed/);

    expect(() => db.prepare(`
      INSERT INTO article_entity (
        article_id, entity_id, evidence_excerpt, confidence
      ) VALUES (?, ?, ?, ?)
    `).run('article-2', 'missing-entity', 'x'.repeat(2001), 0.8)).toThrow();

    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, action, object_type, object_id, trace_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run('audit-1', 'actor:publisher-1', 'article.publish', 'article', 'article-2', 'trace-1');

    expect(() => db.prepare(`
      UPDATE audit_log SET action = ? WHERE id = ?
    `).run('article.mutate', 'audit-1')).toThrow(/audit logs are immutable/);

    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});
