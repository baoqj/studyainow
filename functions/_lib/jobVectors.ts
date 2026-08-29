import { sha256Base64Url } from './crypto';
import { estimateTokenCount, recordLlmUsage } from './llmUsage';

export const JOB_EMBEDDING_MODEL = '@cf/baai/bge-m3' as const;
export const JOB_EMBEDDING_DIMENSIONS = 1024;

const MAX_VECTOR_BATCH = 24;
const MAX_EMBEDDING_CHARACTERS = 40_000;
const MAX_EMBEDDING_REQUEST_ITEMS = 8;
const MAX_EMBEDDING_REQUEST_CHARACTERS = 40_000;
const VECTOR_LOCK_MS = 5 * 60_000;
const MAX_VECTOR_ATTEMPTS = 5;

type VectorQueueRow = {
  id: string;
  vector_id: string;
  job_id: string;
  version_id: string;
  semantic_hash: string;
  attempts: number;
  normalized_json: string;
  title: string;
  location_text: string | null;
  remote_type: string;
  employment_type: string | null;
  language: string;
  job_status: string;
  source_id: string;
  source_type: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  source_published_at: string | null;
  first_collected_at: string | null;
  country_code: string | null;
};

type TagRow = {
  version_id: string;
  tag_key: string;
  label: string;
  tag_type: string;
  confidence: number;
};

function parseObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function vectorDocument(row: VectorQueueRow, tags: TagRow[]) {
  const normalized = parseObject(row.normalized_json);
  const description = textValue(normalized.description);
  const groupedTags = tags
    .filter((tag) => tag.confidence >= 0.55)
    .map((tag) => `${tag.tag_type}: ${tag.label}`)
    .join(', ');
  return [
    `Job title: ${row.title}`,
    `Employer: ${row.company_name}`,
    row.location_text ? `Location: ${row.location_text}` : '',
    `Work arrangement: ${row.remote_type}`,
    row.employment_type ? `Employment type: ${row.employment_type}` : '',
    groupedTags ? `Skills, knowledge, and tags: ${groupedTags}` : '',
    description ? `Job description:\n${description}` : '',
  ].filter(Boolean).join('\n\n').slice(0, MAX_EMBEDDING_CHARACTERS);
}

export async function enqueueJobVectorIndex(
  db: D1Database,
  input: { jobId: string; versionId: string; semanticHash: string },
) {
  await db.prepare(
    `INSERT INTO job_vector_records
       (id, vector_id, job_id, version_id, semantic_hash, embedding_model, dimensions, status, attempts, next_attempt_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, CURRENT_TIMESTAMP)
     ON CONFLICT(job_id) DO UPDATE SET
       version_id = excluded.version_id,
       semantic_hash = excluded.semantic_hash,
       embedding_model = excluded.embedding_model,
       dimensions = excluded.dimensions,
       status = 'pending',
       attempts = 0,
       locked_until = NULL,
       next_attempt_at = CURRENT_TIMESTAMP,
       mutation_id = NULL,
       last_error = NULL,
       indexed_at = NULL,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(
    input.jobId, input.jobId, input.jobId, input.versionId, input.semanticHash,
    JOB_EMBEDDING_MODEL, JOB_EMBEDDING_DIMENSIONS,
  ).run();
}

async function claimVectorBatch(db: D1Database, limit: number) {
  const candidates = await db.prepare(
    `SELECT job_vector_records.id, job_vector_records.vector_id, job_vector_records.job_id,
            job_vector_records.version_id, job_vector_records.semantic_hash, job_vector_records.attempts,
            job_versions.normalized_json, job_postings.title, job_postings.location_text,
            job_postings.remote_type, job_postings.employment_type, job_postings.language,
            job_postings.status AS job_status, job_postings.source_id,
            job_postings.source_published_at, job_postings.first_collected_at,
            job_sources.source_type, companies.id AS company_id, companies.name AS company_name,
            companies.slug AS company_slug,
            (SELECT country_code FROM job_locations
              WHERE job_locations.job_id = job_postings.id
                AND job_locations.version_id = job_vector_records.version_id
              ORDER BY (country_code IS NOT NULL) DESC, is_primary DESC, confidence DESC, created_at ASC LIMIT 1) AS country_code
     FROM job_vector_records
     JOIN job_versions ON job_versions.id = job_vector_records.version_id
     JOIN job_postings ON job_postings.id = job_vector_records.job_id
       AND job_postings.current_version_id = job_vector_records.version_id
     JOIN job_sources ON job_sources.id = job_postings.source_id
     JOIN companies ON companies.id = job_postings.company_id
     WHERE job_vector_records.status IN ('pending', 'error')
       AND job_vector_records.attempts < ?
       AND (job_vector_records.next_attempt_at IS NULL OR job_vector_records.next_attempt_at <= CURRENT_TIMESTAMP)
       AND (job_vector_records.locked_until IS NULL OR job_vector_records.locked_until < CURRENT_TIMESTAMP)
       AND EXISTS (
         SELECT 1 FROM knowledge_refresh_queue
         WHERE knowledge_refresh_queue.source_type = 'job_version'
           AND knowledge_refresh_queue.source_id = job_vector_records.version_id
           AND knowledge_refresh_queue.source_hash = job_vector_records.semantic_hash
           AND knowledge_refresh_queue.status = 'completed'
       )
     ORDER BY CASE job_vector_records.status WHEN 'pending' THEN 0 ELSE 1 END,
              job_vector_records.updated_at ASC
     LIMIT ?`,
  ).bind(MAX_VECTOR_ATTEMPTS, limit).all<VectorQueueRow>();

  const claimed: VectorQueueRow[] = [];
  const lockedUntil = new Date(Date.now() + VECTOR_LOCK_MS).toISOString();
  for (const candidate of candidates.results) {
    const result = await db.prepare(
      `UPDATE job_vector_records
       SET status = 'running', attempts = attempts + 1, locked_until = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status IN ('pending', 'error')
         AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP)`,
    ).bind(lockedUntil, candidate.id).run();
    if (result.meta.changes) claimed.push(candidate);
  }
  return claimed;
}

export async function runPendingJobVectorIndex(env: Env, limit = 16) {
  if (!env.AI || !env.JOB_VECTORS) return { configured: false, claimed: 0, indexed: 0, errors: 0 };
  const batchSize = Math.max(1, Math.min(Math.floor(limit), MAX_VECTOR_BATCH));
  const records = await claimVectorBatch(env.DB, batchSize);
  if (!records.length) return { configured: true, claimed: 0, indexed: 0, errors: 0 };

  const placeholders = records.map(() => '?').join(', ');
  const tags = await env.DB.prepare(
    `SELECT version_id, tag_key, label, tag_type, confidence
     FROM job_tags
     WHERE status = 'active' AND version_id IN (${placeholders})
     ORDER BY confidence DESC, tag_type, label`,
  ).bind(...records.map((record) => record.version_id)).all<TagRow>();
  const tagsByVersion = new Map<string, TagRow[]>();
  for (const tag of tags.results) {
    const existing = tagsByVersion.get(tag.version_id) ?? [];
    existing.push(tag);
    tagsByVersion.set(tag.version_id, existing);
  }

  const documents = records.map((record) => vectorDocument(record, tagsByVersion.get(record.version_id) ?? []));
  const requestBatches: number[][] = [];
  let requestBatch: number[] = [];
  let requestCharacters = 0;
  for (let index = 0; index < documents.length; index += 1) {
    const characters = documents[index].length;
    if (requestBatch.length && (
      requestBatch.length >= MAX_EMBEDDING_REQUEST_ITEMS
      || requestCharacters + characters > MAX_EMBEDDING_REQUEST_CHARACTERS
    )) {
      requestBatches.push(requestBatch);
      requestBatch = [];
      requestCharacters = 0;
    }
    requestBatch.push(index);
    requestCharacters += characters;
  }
  if (requestBatch.length) requestBatches.push(requestBatch);

  let indexed = 0;
  let errors = 0;
  const mutationIds: string[] = [];
  for (const indexes of requestBatches) {
    const chunkRecords = indexes.map((index) => records[index]);
    const chunkDocuments = indexes.map((index) => documents[index]);
    const startedAt = Date.now();
    const inputCharacters = chunkDocuments.reduce((total, document) => total + document.length, 0);
    let usageRecorded = false;
    try {
      const response = await env.AI.run(JOB_EMBEDDING_MODEL, { text: chunkDocuments, truncate_inputs: true });
      const embeddings = 'data' in response && Array.isArray(response.data) ? response.data : [];
      if (embeddings.length !== chunkRecords.length || embeddings.some((embedding) => embedding.length !== JOB_EMBEDDING_DIMENSIONS)) {
        throw new Error(`Workers AI returned an unexpected embedding shape for ${JOB_EMBEDDING_MODEL}`);
      }
      await recordLlmUsage(env.DB, {
        userId: null,
        feature: 'job_embedding',
        operation: 'embedding',
        itemType: 'job_vector_batch',
        itemId: chunkRecords.map((record) => record.job_id).join(',').slice(0, 160),
        itemLabel: `${chunkRecords.length} job vectors`,
        metadata: {
          jobIds: chunkRecords.map((record) => record.job_id).slice(0, 24),
          versionIds: chunkRecords.map((record) => record.version_id).slice(0, 24),
          countries: [...new Set(chunkRecords.map((record) => record.country_code ?? 'ZZ'))].slice(0, 12),
        },
      }, {
        provider: 'workers-ai',
        model: JOB_EMBEDDING_MODEL,
        promptTokens: estimateTokenCount(chunkDocuments.join('\n\n')),
        completionTokens: 0,
        estimated: true,
        inputCharacters,
        outputCharacters: 0,
        requestCount: chunkRecords.length,
        status: 'completed',
        durationMs: Date.now() - startedAt,
      });
      usageRecorded = true;

      const prepared = await Promise.all(chunkRecords.map(async (record, chunkIndex) => {
        const recordTags = (tagsByVersion.get(record.version_id) ?? []).slice(0, 48);
        const metadata = {
          kind: 'job',
          status: record.job_status,
          jobId: record.job_id,
          versionId: record.version_id,
          companyId: record.company_id,
          companySlug: record.company_slug,
          sourceId: record.source_id,
          sourceType: record.source_type,
          language: record.language,
          countryCode: record.country_code ?? 'ZZ',
          remoteType: record.remote_type,
          collectedDay: (record.first_collected_at ?? '').slice(0, 10),
          tagKeys: recordTags.map((tag) => tag.tag_key),
        };
        return {
          record,
          vector: { id: record.vector_id, values: embeddings[chunkIndex], metadata },
          metadata,
          contentHash: await sha256Base64Url(chunkDocuments[chunkIndex]),
        };
      }));
      const mutation = await env.JOB_VECTORS.upsert(prepared.map((item) => item.vector));
      mutationIds.push(mutation.mutationId);
      await env.DB.batch(prepared.map((item) => env.DB.prepare(
        `UPDATE job_vector_records
         SET status = 'indexed', content_hash = ?, mutation_id = ?, metadata_json = ?,
             locked_until = NULL, next_attempt_at = NULL, last_error = NULL,
             indexed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND version_id = ?`,
      ).bind(
        item.contentHash, mutation.mutationId, JSON.stringify(item.metadata), item.record.id, item.record.version_id,
      )));
      indexed += prepared.length;
    } catch (error) {
      if (!usageRecorded) {
        await recordLlmUsage(env.DB, {
          userId: null,
          feature: 'job_embedding',
          operation: 'embedding',
          itemType: 'job_vector_batch',
          itemId: chunkRecords.map((record) => record.job_id).join(',').slice(0, 160),
          itemLabel: `${chunkRecords.length} job vectors`,
          metadata: { jobIds: chunkRecords.map((record) => record.job_id).slice(0, 24) },
        }, {
          provider: 'workers-ai',
          model: JOB_EMBEDDING_MODEL,
          promptTokens: estimateTokenCount(chunkDocuments.join('\n\n')),
          completionTokens: 0,
          estimated: true,
          inputCharacters,
          outputCharacters: 0,
          requestCount: chunkRecords.length,
          status: 'failed',
          durationMs: Date.now() - startedAt,
        });
      }
      const message = error instanceof Error ? error.message.slice(0, 800) : 'Job vector indexing failed';
      await env.DB.batch(chunkRecords.map((record) => env.DB.prepare(
        `UPDATE job_vector_records
         SET status = 'error', locked_until = NULL, next_attempt_at = datetime('now', '+10 minutes'),
             last_error = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND version_id = ?`,
      ).bind(message, record.id, record.version_id)));
      errors += chunkRecords.length;
      console.error('Job vector indexing failed', { count: chunkRecords.length, message });
    }
  }
  return { configured: true, claimed: records.length, indexed, errors, mutationIds };
}
