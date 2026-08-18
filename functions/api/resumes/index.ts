import { requireUser } from '../../_lib/auth';
import { ApiError, errorResponse, json, readJson } from '../../_lib/http';
import { normaliseCareerProfile, parseJson } from '../../_lib/resume';

type CreateBody = { name?: unknown };

function nameFrom(value: unknown) {
  if (value === undefined || value === null || value === '') return 'Untitled resume';
  if (typeof value !== 'string') throw new ApiError(400, 'Resume name must be text');
  const name = value.trim().slice(0, 140);
  if (!name) throw new ApiError(400, 'Resume name is required');
  return name;
}

function summary(row: any) {
  const profile = normaliseCareerProfile(parseJson(row.profile_json));
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status === 'completed' ? 'completed' : 'draft',
    fullName: profile.personal.fullName,
    targetRole: profile.personal.targetRole,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const resumes = await env.DB.prepare(
      `SELECT id, name, status, profile_json, created_at, updated_at
       FROM resume_documents WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC`,
    ).bind(user.id).all();
    return json({ resumes: resumes.results.map(summary) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const body = await readJson<CreateBody>(request);
    const id = crypto.randomUUID();
    const name = nameFrom(body.name);
    await env.DB.prepare(
      `INSERT INTO resume_documents (id, user_id, name, status, profile_json)
       VALUES (?, ?, ?, 'draft', '{}')`,
    ).bind(id, user.id, name).run();
    const row = await env.DB.prepare(
      'SELECT id, name, status, profile_json, created_at, updated_at FROM resume_documents WHERE id = ? AND user_id = ?',
    ).bind(id, user.id).first();
    return json({ resume: summary(row) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
