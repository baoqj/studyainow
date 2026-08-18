import { clearSessionCookie, revokeSession } from '../../_lib/auth';
import { errorResponse, json } from '../../_lib/http';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await revokeSession(env.DB, request);

    return json(
      { ok: true },
      {
        headers: {
          'set-cookie': clearSessionCookie(request),
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
