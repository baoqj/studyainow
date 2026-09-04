export interface TaxonomyNodeSummary {
  id: string;
  type: 'category' | 'tag';
  slug: string;
  name: string;
  aliases: string[];
  status: 'active' | 'merged' | 'retired';
  locked: boolean;
  canonicalId: string | null;
  usageCount: number;
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  if (!slug) throw new Error('invalid_tag_slug');
  return slug;
}

export async function listTaxonomy(db: D1Database): Promise<TaxonomyNodeSummary[]> {
  const rows = await db.prepare(`
    SELECT node.id, node.taxonomy_type, node.slug, node.name, node.aliases_json,
      node.status, node.locked, node.canonical_id,
      (SELECT COUNT(*) FROM story_taxonomy WHERE taxonomy_id = node.id)
      + (SELECT COUNT(*) FROM article_taxonomy WHERE taxonomy_id = node.id) AS usage_count
    FROM taxonomy_node AS node
    WHERE node.taxonomy_type IN ('category', 'tag')
    ORDER BY CASE node.taxonomy_type WHEN 'category' THEN 0 ELSE 1 END, node.name
  `).all<{
    id: string;
    taxonomy_type: 'category' | 'tag';
    slug: string;
    name: string;
    aliases_json: string;
    status: 'active' | 'merged' | 'retired';
    locked: number;
    canonical_id: string | null;
    usage_count: number;
  }>();
  return rows.results.map((row) => ({
    id: row.id,
    type: row.taxonomy_type,
    slug: row.slug,
    name: row.name,
    aliases: JSON.parse(row.aliases_json) as string[],
    status: row.status,
    locked: row.locked === 1,
    canonicalId: row.canonical_id,
    usageCount: Number(row.usage_count),
  }));
}

export async function createTag(
  db: D1Database,
  input: { name: string; slug?: string | null; aliases: string[] },
  actorRef: string,
  traceId: string,
): Promise<string> {
  const slug = slugify(input.slug ?? input.name);
  const id = `tag:${slug}`;
  await db.batch([
    db.prepare(`
      INSERT INTO taxonomy_node (
        id, taxonomy_type, locale, slug, name, aliases_json, status, locked
      ) VALUES (?, 'tag', 'zh-CN', ?, ?, ?, 'active', 1)
    `).bind(id, slug, input.name, JSON.stringify(input.aliases)),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.taxonomy.tag.create', 'taxonomy_node', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, id,
      JSON.stringify({ id, name: input.name, aliases: input.aliases }),
      'Human-created controlled tag', traceId,
    ),
  ]);
  return id;
}

export async function updateTaxonomyNode(
  db: D1Database,
  nodeId: string,
  input: { name: string; aliases: string[]; status?: 'active' | 'retired' },
  actorRef: string,
  traceId: string,
): Promise<boolean> {
  const before = await db.prepare(`
    SELECT id, taxonomy_type, name, aliases_json, status FROM taxonomy_node WHERE id = ?
  `).bind(nodeId).first<{
    id: string;
    taxonomy_type: 'category' | 'tag';
    name: string;
    aliases_json: string;
    status: string;
  }>();
  if (!before) return false;
  if (before.taxonomy_type === 'category' && input.status && input.status !== 'active') {
    throw new Error('primary_categories_cannot_be_retired');
  }
  await db.batch([
    db.prepare(`
      UPDATE taxonomy_node SET name = ?, aliases_json = ?, status = ?, locked = 1, updated_at = ?
      WHERE id = ?
    `).bind(input.name, JSON.stringify(input.aliases), input.status ?? before.status, new Date().toISOString(), nodeId),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        before_json, after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.taxonomy.update', 'taxonomy_node', ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, nodeId, JSON.stringify(before),
      JSON.stringify({ name: input.name, aliases: input.aliases, status: input.status ?? before.status }),
      'Human taxonomy update', traceId,
    ),
  ]);
  return true;
}

export async function mergeTag(
  db: D1Database,
  sourceId: string,
  canonicalId: string,
  actorRef: string,
  traceId: string,
): Promise<boolean> {
  if (sourceId === canonicalId) throw new Error('tag_cannot_merge_into_itself');
  const rows = await db.prepare(`
    SELECT id, taxonomy_type, status FROM taxonomy_node WHERE id IN (?, ?)
  `).bind(sourceId, canonicalId).all<{ id: string; taxonomy_type: string; status: string }>();
  const source = rows.results.find((row) => row.id === sourceId);
  const canonical = rows.results.find((row) => row.id === canonicalId);
  if (!source || !canonical) return false;
  if (
    source.taxonomy_type !== 'tag'
    || canonical.taxonomy_type !== 'tag'
    || canonical.status !== 'active'
  ) throw new Error('invalid_tag_merge');

  await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO story_taxonomy (
        story_id, taxonomy_id, relation_type, confidence, evidence_excerpt,
        locked, source_version, updated_at
      )
      SELECT story_id, ?, relation_type, confidence, evidence_excerpt,
        locked, 'human-merge', ?
      FROM story_taxonomy WHERE taxonomy_id = ?
    `).bind(canonicalId, new Date().toISOString(), sourceId),
    db.prepare('DELETE FROM story_taxonomy WHERE taxonomy_id = ?').bind(sourceId),
    db.prepare(`
      INSERT OR IGNORE INTO article_taxonomy (
        article_id, taxonomy_id, relation_type, confidence, locked, source_version, created_at
      )
      SELECT article_id, ?, relation_type, confidence, locked, 'human-merge', created_at
      FROM article_taxonomy WHERE taxonomy_id = ?
    `).bind(canonicalId, sourceId),
    db.prepare('DELETE FROM article_taxonomy WHERE taxonomy_id = ?').bind(sourceId),
    db.prepare(`
      UPDATE taxonomy_node SET status = 'merged', canonical_id = ?, locked = 1, updated_at = ?
      WHERE id = ?
    `).bind(canonicalId, new Date().toISOString(), sourceId),
    db.prepare(`
      INSERT INTO audit_log (
        id, actor_ref, actor_role, action, object_type, object_id,
        after_json, reason, trace_id
      ) VALUES (?, ?, 'admin', 'news.taxonomy.tag.merge', 'taxonomy_node', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), actorRef, sourceId,
      JSON.stringify({ canonicalId }), 'Human tag merge', traceId,
    ),
  ]);
  return true;
}
