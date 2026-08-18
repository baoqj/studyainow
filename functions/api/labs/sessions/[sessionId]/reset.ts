import { requireUser } from '../../../../_lib/auth';
import { errorResponse, json } from '../../../../_lib/http';

export const onRequestPost: PagesFunction<Env, 'sessionId'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const sessionId = String(params.sessionId);

    await env.DB
      .prepare(
        `UPDATE cli_lab_sessions
         SET status = 'reset', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
      )
      .bind(sessionId, user.id)
      .run();

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
