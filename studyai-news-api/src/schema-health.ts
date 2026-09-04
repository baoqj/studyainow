export const NEWS_SCHEMA_VERSION = 4;

export interface NewsSchemaStatus {
  ok: boolean;
  currentVersion: number | null;
  expectedVersion: number;
}

export async function inspectNewsSchema(db: D1Database): Promise<NewsSchemaStatus> {
  try {
    const row = await db
      .prepare("SELECT value FROM schema_metadata WHERE key = 'news_schema_version'")
      .first<{ value: string }>();
    const currentVersion = row ? Number.parseInt(row.value, 10) : null;

    return {
      ok: currentVersion === NEWS_SCHEMA_VERSION,
      currentVersion: currentVersion !== null && Number.isFinite(currentVersion) ? currentVersion : null,
      expectedVersion: NEWS_SCHEMA_VERSION,
    };
  } catch {
    return {
      ok: false,
      currentVersion: null,
      expectedVersion: NEWS_SCHEMA_VERSION,
    };
  }
}
