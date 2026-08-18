import { getCardProfile, publicCardProfile } from '../../_lib/cardProfiles';
import { ApiError, errorResponse, json } from '../../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ params }) => {
  try {
    const cardId = String(params.cardId ?? '').trim();
    const profile = getCardProfile(cardId);

    if (!profile) {
      throw new ApiError(404, 'Card profile not found');
    }

    return json({ profile: publicCardProfile(profile) });
  } catch (error) {
    return errorResponse(error);
  }
};
