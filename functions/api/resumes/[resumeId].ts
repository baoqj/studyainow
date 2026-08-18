import { requireUser } from '../../_lib/auth';
import { ApiError, errorResponse, json, readJson } from '../../_lib/http';
import {
  generateResumeWithDeepSeek,
  normaliseCareerProfile,
  normaliseResumeOutputLocale,
  normaliseTemplate,
  parseJson,
  templateFromRow,
  type CareerProfile,
} from '../../_lib/resume';
import { listBookmarkedResumeJobs } from '../../_lib/bookmarkedResumeJobs';
import { awardBadge, createNotification } from '../../_lib/userRewards';
import { sendResumeReadyEmail } from '../../_lib/email';

type JsonRecord = Record<string, unknown>;
type SaveBody = { action?: unknown; profile?: unknown; name?: unknown; status?: unknown; template?: unknown; templateId?: unknown };
type GenerateBody = { jobSlugs?: unknown; outputLocale?: unknown; templateId?: unknown };

function text(value: unknown, label: string, max: number, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${label} is required`);
    return '';
  }
  if (typeof value !== 'string') throw new ApiError(400, `${label} must be text`);
  const result = value.trim();
  if (result.length > max) throw new ApiError(400, `${label} is too long`);
  if (required && !result) throw new ApiError(400, `${label} is required`);
  return result;
}

function serialise(value: unknown, label: string, max = 160_000) {
  const result = JSON.stringify(value);
  if (result.length > max) throw new ApiError(400, `${label} is too long`);
  return result;
}

function resumeShape(row: any) {
  const profile = normaliseCareerProfile(parseJson(row.profile_json));
  return {
    id: String(row.id), name: String(row.name), status: row.status === 'completed' ? 'completed' : 'draft', profile,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

async function resumeRow(db: D1Database, userId: string, resumeId: string) {
  const row = await db.prepare(
    `SELECT id, name, status, profile_json, created_at, updated_at
     FROM resume_documents WHERE id = ? AND user_id = ?`,
  ).bind(resumeId, userId).first();
  if (!row) throw new ApiError(404, 'Resume not found');
  return row;
}

function jobSlugs(value: unknown) {
  if (!Array.isArray(value)) throw new ApiError(400, 'Select at least one saved job');
  const slugs = [...new Set(value.map((item) => text(item, 'jobSlug', 180, true)))];
  if (!slugs.length) throw new ApiError(400, 'Select at least one saved job');
  if (slugs.length > 5) throw new ApiError(400, 'Select no more than five saved jobs');
  return slugs;
}

async function saveTemplate(db: D1Database, userId: string, rawTemplate: unknown, rawTemplateId: unknown) {
  const template = normaliseTemplate(rawTemplate);
  const templateId = text(rawTemplateId, 'templateId', 80);
  if (templateId) {
    const result = await db.prepare(
      `UPDATE resume_templates SET name = ?, target_role = ?, template_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
    ).bind(template.name, template.targetRole, serialise({ selectedSkills: template.selectedSkills }, 'template'), templateId, userId).run();
    if (!result.meta.changes) throw new ApiError(404, 'Resume template not found');
    return { id: templateId, ...template };
  }
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO resume_templates (id, user_id, name, target_role, template_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(id, userId, template.name, template.targetRole, serialise({ selectedSkills: template.selectedSkills }, 'template')).run();
  return { id, ...template };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumeId = text(params.resumeId, 'resumeId', 100, true);
    const row = await resumeRow(env.DB, user.id, resumeId);
    const [templates, versions, sources] = await Promise.all([
      env.DB.prepare('SELECT id, name, target_role, template_json, created_at, updated_at FROM resume_templates WHERE user_id = ? ORDER BY updated_at DESC').bind(user.id).all(),
      env.DB.prepare(
        `SELECT id, job_slug, job_title, company_name, document_json, match_json, created_at
         FROM resume_versions WHERE user_id = ? AND resume_id = ? ORDER BY created_at DESC LIMIT 24`,
      ).bind(user.id, resumeId).all(),
      env.DB.prepare(
        `SELECT id, filename, mime_type, size_bytes, source_type, parse_status, extraction_provider, extraction_note,
                extracted_text, extracted_json, r2_key, created_at
         FROM resume_source_documents WHERE user_id = ? AND resume_id = ? ORDER BY created_at DESC LIMIT 24`,
      ).bind(user.id, resumeId).all(),
    ]);
    return json({
      resume: resumeShape(row),
      templates: templates.results.map(templateFromRow),
      versions: versions.results.map((version: any) => ({
        id: version.id, jobSlug: version.job_slug, jobTitle: version.job_title, companyName: version.company_name,
        document: parseJson(version.document_json), match: parseJson(version.match_json), createdAt: version.created_at,
      })),
      sources: sources.results.map((source: any) => ({
        id: source.id, filename: source.filename, mimeType: source.mime_type, sizeBytes: source.size_bytes,
        sourceType: source.source_type, status: source.parse_status, provider: source.extraction_provider,
        retainedInR2: Boolean(source.r2_key),
        note: source.extraction_note || (String(source.extracted_text || '').trim() ? '' : 'no_readable_text'),
        extractedTextLength: String(source.extracted_text || '').length, extracted: parseJson(source.extracted_json), createdAt: source.created_at,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumeId = text(params.resumeId, 'resumeId', 100, true);
    const body = await readJson<SaveBody>(request);
    const action = text(body.action, 'action', 40, true);
    const current = await resumeRow(env.DB, user.id, resumeId);
    if (action === 'profile') {
      const profile = normaliseCareerProfile(body.profile, normaliseCareerProfile(parseJson(current.profile_json)));
      await env.DB.prepare(
        'UPDATE resume_documents SET profile_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      ).bind(serialise(profile, 'profile'), resumeId, user.id).run();
      return json({ profile });
    }
    if (action === 'name') {
      const name = text(body.name, 'Resume name', 140, true);
      await env.DB.prepare('UPDATE resume_documents SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(name, resumeId, user.id).run();
      return json({ name });
    }
    if (action === 'status') {
      const status = text(body.status, 'status', 20, true);
      if (status !== 'draft' && status !== 'completed') throw new ApiError(400, 'Invalid resume status');
      await env.DB.prepare('UPDATE resume_documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(status, resumeId, user.id).run();
      return json({ status });
    }
    if (action === 'template') return json({ template: await saveTemplate(env.DB, user.id, body.template, body.templateId) }, { status: 201 });
    throw new ApiError(400, 'Unsupported resume save action');
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumeId = text(params.resumeId, 'resumeId', 100, true);
    await resumeRow(env.DB, user.id, resumeId);
    const sources = await env.DB.prepare(
      'SELECT r2_key FROM resume_source_documents WHERE user_id = ? AND resume_id = ? AND r2_key IS NOT NULL',
    ).bind(user.id, resumeId).all<{ r2_key: string }>();
    await Promise.all(sources.results.map((source) => env.COURSE_STORAGE.delete(source.r2_key)));
    const statements = [
      env.DB.prepare(
        `DELETE FROM resume_exports WHERE user_id = ? AND resume_version_id IN
         (SELECT id FROM resume_versions WHERE user_id = ? AND resume_id = ?)`,
      ).bind(user.id, user.id, resumeId),
      env.DB.prepare('DELETE FROM resume_source_documents WHERE user_id = ? AND resume_id = ?').bind(user.id, resumeId),
      env.DB.prepare('DELETE FROM resume_versions WHERE user_id = ? AND resume_id = ?').bind(user.id, resumeId),
      env.DB.prepare('DELETE FROM resume_documents WHERE user_id = ? AND id = ?').bind(user.id, resumeId),
    ];
    if (resumeId === `legacy-${user.id}`) statements.push(env.DB.prepare('DELETE FROM resume_profiles WHERE user_id = ?').bind(user.id));
    await env.DB.batch(statements);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumeId = text(params.resumeId, 'resumeId', 100, true);
    const row = await resumeRow(env.DB, user.id, resumeId);
    const profile: CareerProfile = normaliseCareerProfile(parseJson(row.profile_json));
    if (!profile.personal.fullName) throw new ApiError(400, 'Please save your personal information before generating a resume');
    const body = await readJson<GenerateBody>(request);
    const requestedTemplateId = text(body.templateId, 'templateId', 80);
    const templateRow = requestedTemplateId
      ? await env.DB.prepare('SELECT id, name, target_role, template_json, created_at, updated_at FROM resume_templates WHERE id = ? AND user_id = ?').bind(requestedTemplateId, user.id).first()
      : null;
    if (requestedTemplateId && !templateRow) throw new ApiError(404, 'Resume template not found');
    const template = templateRow ? templateFromRow(templateRow) : null;
    const selectedSlugs = jobSlugs(body.jobSlugs);
    const outputLocaleInput = text(body.outputLocale, 'outputLocale', 12) || 'zh-CN';
    const outputLocale = normaliseResumeOutputLocale(outputLocaleInput);
    if (outputLocale !== outputLocaleInput) throw new ApiError(400, 'Unsupported resume output language');
    const bookmarkedJobs = await listBookmarkedResumeJobs(env.DB, user.id);
    const bySlug = new Map(bookmarkedJobs.map((job) => [job.slug, job]));
    const selectedJobs = selectedSlugs.map((slug) => bySlug.get(slug));
    if (selectedJobs.some((job) => !job)) throw new ApiError(404, 'A selected job is no longer available in your saved jobs');
    const jobs = selectedJobs.filter((job): job is NonNullable<typeof job> => Boolean(job));
    const primaryJob = jobs[0];
    const jdText = jobs.map((job) => job.referenceText).join('\n\n---\n\n').slice(0, 24_000);
    const referenceSkills = [...new Set(jobs.flatMap((job) => job.skills))].slice(0, 80);
    const companyName = primaryJob.companyName;
    const targetRole = primaryJob.title || template?.targetRole || profile.personal.targetRole;
    const generated = await generateResumeWithDeepSeek(env, profile, template, jdText, companyName, targetRole, outputLocale, referenceSkills);
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO resume_versions (id, user_id, resume_id, job_id, job_slug, job_title, company_name, document_json, match_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, user.id, resumeId, primaryJob.id, primaryJob.slug, targetRole, companyName,
        serialise({ ...generated.document, templateId: template?.id ?? null, templateName: template?.name ?? 'ATS Classic', outputLocale, jobReferences: jobs.map((job) => ({ slug: job.slug, title: job.title, companyName: job.companyName, skills: job.skills })), createdAt: new Date().toISOString() }, 'resume'),
        serialise(generated.match, 'match')),
      env.DB.prepare('UPDATE resume_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(resumeId, user.id),
    ]);
    await awardBadge(env.DB, { userId: user.id, slug: 'career-ready', reason: 'Generated a job-targeted resume' });
    await createNotification(env.DB, { userId: user.id, kind: 'career_plan', title: 'Resume draft ready', body: `${targetRole} draft is ready for your fact check and export.`, actionUrl: `/me/resume/${resumeId}` });
    const recipient = await env.DB.prepare('SELECT email, username, display_name, preferred_locale FROM users WHERE id = ?').bind(user.id).first<{ email: string; username: string | null; display_name: string; preferred_locale: string | null }>();
    if (recipient) waitUntil(sendResumeReadyEmail(env, recipient.email, {
      userId: user.id, resumeId: id, username: recipient.username ?? recipient.display_name,
      locale: recipient.preferred_locale === 'zh-TW' || recipient.preferred_locale === 'en' || recipient.preferred_locale === 'fr' || recipient.preferred_locale === 'es' ? recipient.preferred_locale : 'zh-CN',
      targetRole, resumeUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me/resume/${resumeId}`,
    }).catch((error) => console.error('Resume-ready email failed', error)));
    return json({ id, jobTitle: targetRole, companyName, document: generated.document, match: generated.match }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
