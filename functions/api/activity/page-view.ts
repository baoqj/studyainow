import { requireUser } from '../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../_lib/http';

type PageViewBody = {
  pageTitle?: unknown;
  route?: unknown;
};

const ROUTE_LIMIT = 500;
const TITLE_LIMIT = 200;

function activityCategory(route: string) {
  if (/^\/jobs\/[^/]+$/.test(route)) return 'job';
  if (/^\/interviews\/[^/]+(?:\/.*)?$/.test(route)) return 'interview';
  if (route === '/courses' || route.startsWith('/courses/')) return 'course';
  if (route === '/resume' || route === '/me/resume' || route.startsWith('/me/resume/')) return 'resume';
  if (route === '/admin' || route.startsWith('/admin/')) return 'admin';
  return 'general';
}

function entityId(route: string, category: string) {
  const patterns: Record<string, RegExp> = {
    job: /^\/jobs\/([^/]+)$/,
    interview: /^\/interviews\/([^/]+)/,
    course: /^\/courses\/([^/]+)/,
    resume: /^\/me\/resume\/([^/]+)$/,
  };
  const match = patterns[category]?.exec(route);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).slice(0, 180);
  } catch {
    return match[1].slice(0, 180);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const body = await readJson<PageViewBody>(request);
    const pageTitle = requireString(body.pageTitle, 'pageTitle').replace(/\s+/g, ' ').slice(0, TITLE_LIMIT);
    const route = requireString(body.route, 'route').slice(0, ROUTE_LIMIT);
    if (!route.startsWith('/') || route.startsWith('//') || route.includes('?') || route.includes('#')) {
      throw new ApiError(400, 'route must be an application pathname');
    }
    const category = activityCategory(route);

    await env.DB.prepare(
      `INSERT INTO user_activity_events (
         id, user_id, event_type, category, page_title, route, entity_id, metadata_json
       ) VALUES (?, ?, 'page_view', ?, ?, ?, ?, '{}')`,
    ).bind(crypto.randomUUID(), user.id, category, pageTitle, route, entityId(route, category)).run();

    return json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
