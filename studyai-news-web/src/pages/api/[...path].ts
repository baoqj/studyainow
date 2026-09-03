import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { forwardNewsApi } from '../../lib/proxy';

export const prerender = false;

export const ALL: APIRoute = ({ request }) => forwardNewsApi(request, env.NEWS_API);
