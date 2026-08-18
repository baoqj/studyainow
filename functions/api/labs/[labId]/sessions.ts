import { requireUser } from '../../../_lib/auth';
import { getLabPayload } from '../../../_lib/labEngine';
import { errorResponse, json } from '../../../_lib/http';

export const onRequestPost: PagesFunction<Env, 'labId'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const labId = String(params.labId);
    await getLabPayload(env.DB, labId);

    const existing = await env.DB
      .prepare(
        `SELECT id, status, current_step
         FROM cli_lab_sessions
         WHERE user_id = ? AND lab_id = ? AND status = 'in_progress'
         ORDER BY started_at DESC
         LIMIT 1`,
      )
      .bind(user.id, labId)
      .first();

    if (existing) {
      return json({ session: existing, resumed: true });
    }

    const session = {
      id: crypto.randomUUID(),
      status: 'in_progress',
      current_step: 0,
    };

    await env.DB
      .prepare(
        `INSERT INTO cli_lab_sessions (id, user_id, lab_id, status, current_step)
         VALUES (?, ?, ?, 'in_progress', 0)`,
      )
      .bind(session.id, user.id, labId)
      .run();

    return json({ session, resumed: false });
  } catch (error) {
    return errorResponse(error);
  }
};
