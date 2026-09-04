import type { Env } from '../env';

const SERVICE_ACTOR_PATTERN = /^studyai-user:[0-9a-f-]{16,80}$/i;

export interface AdminIdentity {
  actorRef: string;
  role: 'admin';
  method: 'bearer' | 'service';
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

function configuredSecret(value: string | undefined): string | null {
  return value && value.length >= 32 ? value : null;
}

export function isAdminBearerAuthorized(request: Request, env: Env): boolean {
  const expected = configuredSecret(env.INGEST_ADMIN_TOKEN);
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') && constantTimeEqual(header.slice(7), expected);
}

function serviceIdentity(request: Request, env: Env): AdminIdentity | null {
  const expected = configuredSecret(env.STUDYAI_ADMIN_SERVICE_TOKEN);
  const provided = request.headers.get('x-studyai-admin-service-token') ?? '';
  const actorRef = request.headers.get('x-studyai-admin-actor') ?? '';
  if (!expected || !constantTimeEqual(provided, expected) || !SERVICE_ACTOR_PATTERN.test(actorRef)) return null;
  return { actorRef, role: 'admin', method: 'service' };
}

export async function authorizeAdminRequest(request: Request, env: Env): Promise<AdminIdentity | null> {
  const internalIdentity = serviceIdentity(request, env);
  if (internalIdentity) return internalIdentity;
  if (isAdminBearerAuthorized(request, env)) {
    return { actorRef: 'operator:news-admin', role: 'admin', method: 'bearer' };
  }
  return null;
}
