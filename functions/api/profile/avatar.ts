import { requireUser } from '../../_lib/auth';
import { ApiError, errorResponse, json } from '../../_lib/http';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireUser(env.DB, request);
    const contentType = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new ApiError(415, 'Avatar must be a JPEG, PNG, or WebP image');
    const body = await request.arrayBuffer();
    if (!body.byteLength || body.byteLength > MAX_AVATAR_BYTES) throw new ApiError(413, 'Avatar must be smaller than 2 MB');

    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;
    const current = await env.DB.prepare('SELECT avatar_key FROM users WHERE id = ?').bind(user.id).first<{ avatar_key: string | null }>();
    await env.COURSE_STORAGE.put(key, body, { httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' } });
    await env.DB.prepare('UPDATE users SET avatar_key = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(key, `/content/${key}`, user.id).run();
    if (current?.avatar_key && current.avatar_key.startsWith(`avatars/${user.id}/`)) {
      await env.COURSE_STORAGE.delete(current.avatar_key).catch(() => undefined);
    }
    return json({ avatarUrl: `/content/${key}` });
  } catch (error) {
    return errorResponse(error);
  }
};
