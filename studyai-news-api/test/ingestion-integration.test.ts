import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { getIngestionSource } from '../src/ingestion/repository';
import { ingestSource } from '../src/ingestion/service';

const migrationsDirectory = fileURLToPath(new URL('../migrations', import.meta.url));
const migrationSql = readdirSync(migrationsDirectory)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort()
  .map((file) => readFileSync(`${migrationsDirectory}/${file}`, 'utf8'));

class SqliteD1Statement {
  private values: SQLInputValue[] = [];

  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): SqliteD1Statement {
    const statement = new SqliteD1Statement(this.database, this.sql);
    statement.values = values.map((value) => value as SQLInputValue);
    return statement;
  }

  async first<T>(): Promise<T | null> {
    return (this.database.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[]; success: true; meta: Record<string, unknown> }> {
    return {
      results: this.database.prepare(this.sql).all(...this.values) as T[],
      success: true,
      meta: {},
    };
  }

  async run(): Promise<{ results: never[]; success: true; meta: { changes: number } }> {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { results: [], success: true, meta: { changes: Number(result.changes) } };
  }
}

function sqliteD1(database: DatabaseSync): D1Database {
  const api = {
    prepare(sql: string) {
      return new SqliteD1Statement(database, sql);
    },
    async batch(statements: SqliteD1Statement[]) {
      database.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec('COMMIT');
        return results;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return api as unknown as D1Database;
}

let database: DatabaseSync | null = null;

afterEach(() => {
  database?.close();
  database = null;
});

describe('feed ingestion vertical slice', () => {
  it('persists normalized items and a private snapshot, then deduplicates and records failure', async () => {
    database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    for (const sql of migrationSql) database.exec(sql);

    const db = sqliteD1(database);
    const put = vi.fn().mockResolvedValue({});
    const head = vi.fn().mockResolvedValue({});
    const env: Env = {
      DB: db,
      MEDIA: { put, head } as unknown as R2Bucket,
      ENVIRONMENT: 'test',
      RELEASE_VERSION: 'test-release',
    };
    const feed = `<?xml version="1.0"?>
      <rss version="2.0"><channel><item>
        <title>Production agent platform reliability update</title>
        <link>https://openai.com/news/agent-platform?utm_source=rss</link>
        <guid>agent-platform-2026</guid>
        <pubDate>Wed, 02 Sep 2026 12:00:00 GMT</pubDate>
        <description><![CDATA[&lt;p&gt;This official update describes production architecture, evaluation, monitoring, security controls, testing, deployment, incident response, and practical lessons for teams building reliable AI agents.&lt;/p&gt;]]></description>
      </item></channel></rss>`;

    const firstSource = await getIngestionSource(db, 'openai-news');
    expect(firstSource).not.toBeNull();
    const first = await ingestSource(env, firstSource!, {
      trigger: 'manual',
      manualKey: 'integration-001',
      requestedAt: new Date('2026-09-03T10:00:00.000Z'),
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(new Response(feed, {
        status: 200,
        headers: { 'content-type': 'application/rss+xml', etag: '"v1"' },
      })),
    });

    expect(first).toMatchObject({ status: 'succeeded', itemsInserted: 1, itemsRejected: 0 });
    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0]?.[0]).toMatch(/^source-feed\/openai-news\/\d{4}\/\d{2}\/\d{2}\//);
    expect(database.prepare(`
      SELECT canonical_url, processing_status, parser_version
      FROM source_item WHERE source_id = 'openai-news'
    `).get()).toEqual({
      canonical_url: 'https://openai.com/news/agent-platform',
      processing_status: 'normalized',
      parser_version: 'rss_atom_v2',
    });
    expect(database.prepare(`
      SELECT access_policy FROM source_feed_snapshot WHERE source_id = 'openai-news'
    `).get()).toEqual({ access_policy: 'restricted' });

    database.exec(`
      UPDATE source_item
      SET content_hash = 'legacy-parser-hash', normalized_hash = 'legacy-parser-hash',
          parser_version = 'rss_atom_v1', summary = '<p>legacy markup</p>'
      WHERE source_id = 'openai-news';
      UPDATE source_cursor SET last_parser_version = 'rss_atom_v1'
      WHERE source_id = 'openai-news';
    `);

    const secondSource = await getIngestionSource(db, 'openai-news');
    const second = await ingestSource(env, secondSource!, {
      trigger: 'manual',
      manualKey: 'integration-002',
      requestedAt: new Date('2026-09-03T11:00:00.000Z'),
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(new Response(feed, {
        status: 200,
        headers: { 'content-type': 'application/rss+xml', etag: '"v1"' },
      })),
    });

    expect(second).toMatchObject({ status: 'succeeded', itemsUpdated: 1 });
    expect(put).toHaveBeenCalledOnce();
    expect(database.prepare(`
      SELECT parser_version, summary FROM source_item WHERE source_id = 'openai-news'
    `).get()).toMatchObject({ parser_version: 'rss_atom_v2' });
    expect(String(database.prepare(`
      SELECT summary FROM source_item WHERE source_id = 'openai-news'
    `).get()?.summary)).not.toContain('<p>');
    expect(database.prepare(`
      SELECT COUNT(*) AS count FROM source_feed_snapshot WHERE source_id = 'openai-news'
    `).get()).toEqual({ count: 1 });

    const thirdSource = await getIngestionSource(db, 'openai-news');
    const third = await ingestSource(env, thirdSource!, {
      trigger: 'manual',
      manualKey: 'integration-003',
      requestedAt: new Date('2026-09-03T12:00:00.000Z'),
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(new Response(feed, {
        status: 200,
        headers: { 'content-type': 'application/rss+xml', etag: '"v1"' },
      })),
    });

    expect(third.status).toBe('not_modified');
    expect(put).toHaveBeenCalledOnce();

    const fourthSource = await getIngestionSource(db, 'openai-news');
    const fourth = await ingestSource(env, fourthSource!, {
      trigger: 'manual',
      manualKey: 'integration-004',
      requestedAt: new Date('2026-09-03T13:00:00.000Z'),
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(new Response('<not-valid', {
        status: 200,
        headers: { 'content-type': 'application/rss+xml' },
      })),
    });

    expect(fourth).toMatchObject({ status: 'failed', errorCode: 'invalid_xml' });
    expect(database.prepare(`
      SELECT status, error_code FROM source_fetch_run
      WHERE id = ?
    `).get(fourth.runId)).toEqual({ status: 'failed', error_code: 'invalid_xml' });
    expect(database.prepare(`
      SELECT consecutive_failures, last_error_code FROM source_cursor
      WHERE source_id = 'openai-news'
    `).get()).toEqual({ consecutive_failures: 1, last_error_code: 'invalid_xml' });
    expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});
