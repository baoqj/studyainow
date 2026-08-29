import { ApiError } from './http';

export const ADMIN_ROLE_KEYS = ['user', 'member', 'operator', 'leader', 'admin'] as const;
export type AdminRoleKey = (typeof ADMIN_ROLE_KEYS)[number];

export function adminRole(value: unknown): AdminRoleKey {
  if (typeof value === 'string' && ADMIN_ROLE_KEYS.includes(value as AdminRoleKey)) {
    return value as AdminRoleKey;
  }
  throw new ApiError(400, 'role must be user, member, operator, leader, or admin');
}

export function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, maxLength) : null;
}

export function sqliteLike(value: string) {
  return `%${value.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}
