import { requireUser } from '../../_lib/auth';
import { ApiError, errorResponse, json } from '../../_lib/http';
import {
  extractCareerFactsFromUpload,
  extractFileText,
  mergeCareerProfile,
  profileFromRow,
  validateUpload,
} from '../../_lib/resume';

function serialise(value: unknown, name: string, max = 160_000) {
  const output = JSON.stringify(value);
  if (output.length > max) throw new ApiError(400, `${name} is too long`);
  return output;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) throw new ApiError(400, 'multipart/form-data is required');
    const form = await request.formData();
    const candidate = form.get('file');
    if (!(candidate instanceof File)) throw new ApiError(400, 'A resume file is required');
    const ext = validateUpload(candidate);
    const text = await extractFileText(candidate, ext);
    const extracted = await extractCareerFactsFromUpload(env, candidate, ext, text);
    const currentRow = await env.DB.prepare(
      `SELECT full_name, headline, location, website, summary, experience_json, projects_json,
              profile_json, contact_email, phone FROM resume_profiles WHERE user_id = ?`,
    ).bind(user.id).first();
    const profile = mergeCareerProfile(profileFromRow(currentRow), extracted.facts);
    const sourceId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO resume_source_documents
           (id, user_id, filename, mime_type, size_bytes, source_type, parse_status, extracted_text, extracted_json)
         VALUES (?, ?, ?, ?, ?, 'upload', ?, ?, ?)`,
      ).bind(sourceId, user.id, candidate.name.slice(0, 240), candidate.type || 'application/octet-stream', candidate.size, extracted.status, text, serialise(extracted.facts, 'extracted facts')),
      env.DB.prepare(
        `INSERT INTO resume_profiles
           (id, user_id, full_name, headline, location, website, summary, experience_json, projects_json,
            profile_json, contact_email, phone, source_updated_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           full_name = excluded.full_name, headline = excluded.headline, location = excluded.location,
           website = excluded.website, summary = excluded.summary, experience_json = excluded.experience_json,
           projects_json = excluded.projects_json, profile_json = excluded.profile_json,
           contact_email = excluded.contact_email, phone = excluded.phone,
           source_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      ).bind(
        crypto.randomUUID(), user.id, profile.personal.fullName, profile.personal.targetRole, profile.personal.location,
        profile.personal.website, profile.summary, serialise(profile.experience, 'experience'), serialise(profile.projects, 'projects'),
        serialise(profile, 'profile'), profile.personal.email, profile.personal.phone,
      ),
    ]);
    return json({ sourceId, profile, extracted: extracted.facts, provider: extracted.provider, status: extracted.status, extractedTextLength: text.length }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
