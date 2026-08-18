import { getLabPayload } from '../../_lib/labEngine';
import { errorResponse, json } from '../../_lib/http';

export const onRequestGet: PagesFunction<Env, 'labId'> = async ({ env, params }) => {
  try {
    const lab = await getLabPayload(env.DB, String(params.labId));
    return json({ lab });
  } catch (error) {
    return errorResponse(error);
  }
};
