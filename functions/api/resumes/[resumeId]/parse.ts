import { requireUser } from '../../../_lib/auth';
import { ApiError, errorResponse, json } from '../../../_lib/http';
import {
  extractCareerFactsFromUpload,
  extractFileText,
  mergeCareerProfile,
  normaliseCareerProfile,
  parseJson,
  validateUpload,
} from '../../../_lib/resume';

function serialise(value: unknown, name: string, max = 160_000) {
  const output = JSON.stringify(value);
  if (output.length > max) throw new ApiError(400, `${name} is too long`);
  return output;
}

function safeFilename(filename: string) {
  const compact = filename.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_');
  return (compact || 'resume').slice(0, 160);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumeId = typeof params.resumeId === 'string' ? params.resumeId.trim().slice(0, 100) : '';
    if (!resumeId) throw new ApiError(400, 'resumeId is required');
    const document = await env.DB.prepare('SELECT profile_json FROM resume_documents WHERE id = ? AND user_id = ?').bind(resumeId, user.id).first<{ profile_json: string }>();
    if (!document) throw new ApiError(404, 'Resume not found');
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) throw new ApiError(400, 'multipart/form-data is required');
    const form = await request.formData();
    const candidate = form.get('file');
    if (!(candidate instanceof File)) throw new ApiError(400, 'A resume file is required');
    const ext = validateUpload(candidate);
    const sourceId = crypto.randomUUID();
    const extractedText = await extractFileText(candidate, ext);
    const extracted = await extractCareerFactsFromUpload(env, candidate, ext, extractedText, {
      userId: user.id,
      feature: 'resume_extract',
      operation: 'chat_completion',
      itemType: 'resume_source',
      itemId: sourceId,
      itemLabel: candidate.name,
      route: `/me/resume/${resumeId}`,
      metadata: { resumeId },
    });
    const existing = normaliseCareerProfile(parseJson(document.profile_json));
    const profile = extracted.status === 'failed' ? existing : mergeCareerProfile(existing, extracted.facts);
    const r2Key = `resumes/raw/${user.id}/${sourceId}/${safeFilename(candidate.name)}`;
    await env.COURSE_STORAGE.put(r2Key, await candidate.arrayBuffer(), {
      httpMetadata: { contentType: candidate.type || 'application/octet-stream' },
      customMetadata: { userId: user.id, resumeId, sourceId },
    });
    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO resume_source_documents
             (id, user_id, resume_id, filename, mime_type, size_bytes, source_type, parse_status,
              extracted_text, extracted_json, extraction_provider, extraction_note, r2_key)
           VALUES (?, ?, ?, ?, ?, ?, 'upload', ?, ?, ?, ?, ?, ?)`,
        ).bind(sourceId, user.id, resumeId, candidate.name.slice(0, 240), candidate.type || 'application/octet-stream', candidate.size,
          extracted.status, extractedText, serialise(extracted.facts, 'extracted facts'), extracted.provider, extracted.note, r2Key),
        env.DB.prepare(
          'UPDATE resume_documents SET profile_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        ).bind(serialise(profile, 'profile'), resumeId, user.id),
      ]);
    } catch (error) {
      await env.COURSE_STORAGE.delete(r2Key).catch(() => undefined);
      throw error;
    }
    return json({
      sourceId, profile, extracted: extracted.facts, provider: extracted.provider, status: extracted.status,
      note: extracted.note, extractedTextLength: extractedText.length,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
