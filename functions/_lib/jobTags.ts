export type PublicJobTag = {
  key: string;
  label: string;
  type: string;
  language: string;
  source: string;
  confidence: number;
};

type TagRow = {
  version_id: string;
  tag_key: string;
  label: string;
  tag_type: string;
  language: string;
  source_method: string;
  confidence: number;
};

export async function loadPublicJobTags(db: D1Database, versionIds: string[]) {
  const uniqueVersionIds = [...new Set(versionIds.filter(Boolean))];
  const byVersion = new Map<string, PublicJobTag[]>();
  if (!uniqueVersionIds.length) return byVersion;
  const placeholders = uniqueVersionIds.map(() => '?').join(', ');
  const rows = await db.prepare(
    `SELECT version_id, tag_key, label, tag_type, language, source_method, confidence
     FROM job_tags
     WHERE status = 'active' AND confidence >= 0.55
       AND version_id IN (${placeholders})
     ORDER BY version_id, confidence DESC, tag_type, label`,
  ).bind(...uniqueVersionIds).all<TagRow>();
  for (const row of rows.results) {
    const tags = byVersion.get(row.version_id) ?? [];
    if (tags.length < 32) tags.push({
      key: row.tag_key,
      label: row.label,
      type: row.tag_type,
      language: row.language,
      source: row.source_method,
      confidence: Number(row.confidence),
    });
    byVersion.set(row.version_id, tags);
  }
  return byVersion;
}
