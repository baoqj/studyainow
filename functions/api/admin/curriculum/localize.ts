import { assertCurriculumToken, curriculumFiles, curriculumLocale, localizeCurriculumFiles } from '../../../_lib/curriculumLocalization';
import { errorResponse, json, readJson } from '../../../_lib/http';

type LocalizationRequest = { locale?: unknown; files?: unknown };

/**
 * Private build-time endpoint. It is deliberately token-protected rather than
 * session-cookie protected so the local content compiler can use Worker-held
 * model secrets without exposing them to a browser or the repository.
 */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    assertCurriculumToken(env, request);
    const body = await readJson<LocalizationRequest>(request);
    const locale = curriculumLocale(body.locale);
    const files = curriculumFiles(body.files);
    return json(await localizeCurriculumFiles(env, locale, files));
  } catch (error) {
    return errorResponse(error);
  }
};
