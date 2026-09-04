import type { Env } from '../env';

export const ADMIN_SESSION_COOKIE = 'studyai_news_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminIdentity {
  actorRef: string;
  role: 'admin';
  method: 'bearer' | 'session';
}

interface SessionPayload {
  actorRef: string;
  role: 'admin';
  expiresAt: number;
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maximumLength = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const result = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(result));
}

function configuredSecret(env: Env): string | null {
  const secret = env.INGEST_ADMIN_TOKEN;
  return secret && secret.length >= 32 ? secret : null;
}

export function isAdminBearerAuthorized(request: Request, env: Env): boolean {
  const expected = configuredSecret(env);
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') && constantTimeEqual(header.slice(7), expected);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [cookieName, ...cookieValue] = part.trim().split('=');
    if (cookieName === name) return cookieValue.join('=');
  }
  return null;
}

export async function createAdminSessionCookie(env: Env, now = new Date()): Promise<string> {
  const secret = configuredSecret(env);
  if (!secret) throw new Error('admin_auth_not_configured');
  const payload: SessionPayload = {
    actorRef: 'operator:news-admin',
    role: 'admin',
    expiresAt: Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const encodedSignature = await signature(encodedPayload, secret);
  return `${ADMIN_SESSION_COOKIE}=${encodedPayload}.${encodedSignature}; Path=/api/admin/news; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminSessionCookie(): string {
  return `${ADMIN_SESSION_COOKIE}=; Path=/api/admin/news; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

async function identityFromSession(request: Request, env: Env, now = new Date()): Promise<AdminIdentity | null> {
  const secret = configuredSecret(env);
  const cookie = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!secret || !cookie) return null;
  const separator = cookie.lastIndexOf('.');
  if (separator < 1) return null;
  const encodedPayload = cookie.slice(0, separator);
  const providedSignature = cookie.slice(separator + 1);
  const expectedSignature = await signature(encodedPayload, secret);
  if (!constantTimeEqual(providedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as SessionPayload;
    if (
      payload.actorRef !== 'operator:news-admin'
      || payload.role !== 'admin'
      || payload.expiresAt <= Math.floor(now.getTime() / 1000)
    ) return null;
    return { actorRef: payload.actorRef, role: payload.role, method: 'session' };
  } catch {
    return null;
  }
}

export async function authorizeAdminRequest(request: Request, env: Env): Promise<AdminIdentity | null> {
  if (isAdminBearerAuthorized(request, env)) {
    return { actorRef: 'operator:news-admin', role: 'admin', method: 'bearer' };
  }
  return identityFromSession(request, env);
}

export function hasValidMutationOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('x-forwarded-host') ?? new URL(request.url).host;
    return originHost === requestHost && request.headers.get('x-news-csrf') === '1';
  } catch {
    return false;
  }
}
