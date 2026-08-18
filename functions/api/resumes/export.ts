import { requireUser } from '../../_lib/auth';
import { ApiError, errorResponse, json, readJson } from '../../_lib/http';

type ExportBody = { versionId?: unknown; format?: unknown; filename?: unknown };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const body = await readJson<ExportBody>(request);
    const versionId = typeof body.versionId === 'string' ? body.versionId.trim() : '';
    const format = typeof body.format === 'string' ? body.format.trim().toLowerCase() : '';
    const filename = typeof body.filename === 'string' ? body.filename.trim().slice(0, 240) : '';
    if (!versionId || !['docx', 'pdf', 'md'].includes(format) || !filename) throw new ApiError(400, 'Invalid export request');
    const version = await env.DB.prepare('SELECT id FROM resume_versions WHERE id = ? AND user_id = ?').bind(versionId, user.id).first();
    if (!version) throw new ApiError(404, 'Resume version not found');
    await env.DB.prepare(
      'INSERT INTO resume_exports (id, user_id, resume_version_id, format, filename) VALUES (?, ?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), user.id, versionId, format, filename).run();
    return json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
