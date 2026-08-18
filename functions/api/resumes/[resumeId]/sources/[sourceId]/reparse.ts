import { requireUser } from '../../../../../_lib/auth';
import { ApiError, errorResponse, json } from '../../../../../_lib/http';
import {
  extractCareerFactsFromUpload,
  extractFileText,
  mergeCareerProfile,
  normaliseCareerProfile,
  parseJson,
  validateUpload,
} from '../../../../../_lib/resume';

function serialise(value: unknown, name: string, max = 160_000) {
  const output = JSON.stringify(value);
  if (output.length > max) throw new ApiError(400, `${name} is too long`);
  return output;
}

type ResumeSourceRow = {
  filename: string;
  mime_type: string;
  r2_key: string | null;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumeId = typeof params.resumeId === 'string' ? params.resumeId.trim().slice(0, 100) : '';
    const sourceId = typeof params.sourceId === 'string' ? params.sourceId.trim().slice(0, 100) : '';
    if (!resumeId || !sourceId) throw new ApiError(400, 'resumeId and sourceId are required');

    const [document, source] = await Promise.all([
      env.DB.prepare('SELECT profile_json FROM resume_documents WHERE id = ? AND user_id = ?').bind(resumeId, user.id).first<{ profile_json: string }>(),
      env.DB.prepare(
        `SELECT filename, mime_type, r2_key FROM resume_source_documents
         WHERE id = ? AND resume_id = ? AND user_id = ?`,
      ).bind(sourceId, resumeId, user.id).first<ResumeSourceRow>(),
    ]);
    if (!document) throw new ApiError(404, 'Resume not found');
    if (!source) throw new ApiError(404, 'Resume source not found');
    if (!source.r2_key) throw new ApiError(409, 'The original source file is not available for re-extraction');

    const object = await env.COURSE_STORAGE.get(source.r2_key);
    if (!object) throw new ApiError(404, 'The original source file is no longer available');
    const file = new File([await object.arrayBuffer()], source.filename, { type: source.mime_type || 'application/octet-stream' });
    const ext = validateUpload(file);
    const extractedText = await extractFileText(file, ext);
    const extracted = await extractCareerFactsFromUpload(env, file, ext, extractedText);
    const existing = normaliseCareerProfile(parseJson(document.profile_json));
    const profile = extracted.status === 'failed' ? existing : mergeCareerProfile(existing, extracted.facts);

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE resume_source_documents
         SET parse_status = ?, extracted_text = ?, extracted_json = ?, extraction_provider = ?, extraction_note = ?
         WHERE id = ? AND resume_id = ? AND user_id = ?`,
      ).bind(extracted.status, extractedText, serialise(extracted.facts, 'extracted facts'), extracted.provider, extracted.note, sourceId, resumeId, user.id),
      env.DB.prepare(
        'UPDATE resume_documents SET profile_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      ).bind(serialise(profile, 'profile'), resumeId, user.id),
    ]);

    return json({
      sourceId,
      profile,
      extracted: extracted.facts,
      provider: extracted.provider,
      status: extracted.status,
      note: extracted.note,
      extractedTextLength: extractedText.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
