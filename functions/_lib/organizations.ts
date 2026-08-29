import { getAuthUser, requireAdmin, requireUser, type AuthUser } from './auth';
import { sha256Base64Url } from './crypto';
import { ApiError } from './http';

export const ORGANIZATION_TYPES = ['company', 'school', 'training', 'community', 'other'] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export type OrganizationActor = {
  user: AuthUser;
  isAdmin: boolean;
  organizationId: string;
  organizationName: string;
};

export function organizationType(value: unknown): OrganizationType {
  return typeof value === 'string' && ORGANIZATION_TYPES.includes(value as OrganizationType)
    ? value as OrganizationType
    : 'other';
}

export function organizationPublicId() {
  const now = new Date();
  const month = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `ORG-${month}-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')}`;
}

export function inviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return `INV-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')}`;
}

export function inviteCodeHint(code: string) {
  return `${code.slice(0, 4)}••••${code.slice(-4)}`;
}

export type ResolvedOrganizationInvitation = {
  id: string;
  organization_id: string;
  organization_name: string;
  public_id: string;
  used_count: number;
  max_uses: number | null;
};

const invitationSelect = `SELECT organization_invites.id, organization_invites.organization_id, organization_invites.used_count,
        organization_invites.max_uses, organizations.name AS organization_name, organizations.public_id
 FROM organization_invites JOIN organizations ON organizations.id = organization_invites.organization_id
 WHERE organization_invites.status = 'active'
   AND organization_invites.expires_at > CURRENT_TIMESTAMP
   AND (organization_invites.max_uses IS NULL OR organization_invites.used_count < organization_invites.max_uses)
   AND organizations.status = 'active'`;

export async function resolveInvitation(db: D1Database, rawCode: string) {
  const code = rawCode.trim();
  if (!code || code.length > 64) return null;
  const tokenHash = await sha256Base64Url(code.toUpperCase());
  return db.prepare(`${invitationSelect} AND organization_invites.token_hash = ?`)
    .bind(tokenHash)
    .first<ResolvedOrganizationInvitation>();
}

export async function resolveInvitationById(db: D1Database, invitationId: string) {
  return db.prepare(`${invitationSelect} AND organization_invites.id = ?`)
    .bind(invitationId)
    .first<ResolvedOrganizationInvitation>();
}

export async function joinOrganizationByInvitationId(db: D1Database, userId: string, invitationId: string) {
  const invitation = await resolveInvitationById(db, invitationId);
  if (!invitation) return { joined: false as const, reason: 'invalid' as const };
  const user = await db.prepare('SELECT organization_id FROM users WHERE id = ?')
    .bind(userId)
    .first<{ organization_id: string | null }>();
  if (!user || (user.organization_id && user.organization_id !== invitation.organization_id)) {
    return { joined: false as const, reason: 'other_organization' as const };
  }

  const useId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(
      `UPDATE organization_invites
       SET used_count = used_count + 1, last_used_at = CURRENT_TIMESTAMP
       WHERE id = ? AND organization_id = ? AND status = 'active'
         AND expires_at > CURRENT_TIMESTAMP
         AND (max_uses IS NULL OR used_count < max_uses)
         AND NOT EXISTS (
           SELECT 1 FROM organization_invite_uses
           WHERE invite_id = organization_invites.id AND user_id = ?
         )
         AND EXISTS (
           SELECT 1 FROM organizations
           WHERE organizations.id = organization_invites.organization_id AND organizations.status = 'active'
         )`,
    ).bind(invitation.id, invitation.organization_id, userId),
    db.prepare(
      `INSERT INTO organization_invite_uses (id, invite_id, organization_id, user_id)
       SELECT ?, ?, ?, ? WHERE changes() = 1`,
    ).bind(useId, invitation.id, invitation.organization_id, userId),
    db.prepare(
      `UPDATE users
       SET organization_id = ?, organization_role = 'member',
           organization_joined_at = COALESCE(organization_joined_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND EXISTS (SELECT 1 FROM organization_invite_uses WHERE id = ?)`,
    ).bind(invitation.organization_id, userId, useId),
    db.prepare(
      `INSERT INTO organization_audit_logs
        (id, organization_id, actor_user_id, action, target_type, target_id, after_json, request_id)
       SELECT ?, ?, ?, 'member.joined_by_invite', 'user', ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM organization_invite_uses WHERE id = ?)`,
    ).bind(
      crypto.randomUUID(), invitation.organization_id, userId, userId,
      JSON.stringify({ inviteId: invitation.id }), `oauth-registration:${userId}:${invitation.id}`, useId,
    ),
  ]);
  return Number(results[2]?.meta.changes ?? 0) > 0
    ? { joined: true as const, invitation }
    : { joined: false as const, reason: 'invalid' as const };
}

export async function requestIpHash(request: Request) {
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? '';
  return ip ? sha256Base64Url(ip) : null;
}

async function logScopeDenial(db: D1Database, user: AuthUser, ownOrganizationId: string | null, targetOrganizationId: string) {
  if (!ownOrganizationId) return;
  await db.prepare(
    `INSERT INTO organization_audit_logs
      (id, organization_id, actor_user_id, action, target_type, target_id, after_json)
     SELECT ?, id, ?, 'security.scope_denied', 'organization', ?, ?
     FROM organizations WHERE id = ?`,
  ).bind(
    crypto.randomUUID(), user.id, targetOrganizationId,
    JSON.stringify({ attemptedOrganizationId: targetOrganizationId }), ownOrganizationId,
  ).run().catch(() => undefined);
}

export async function requireOrganizationPermission(db: D1Database, request: Request, targetOrganizationId?: string): Promise<OrganizationActor> {
  const user = await requireUser(db, request);
  const isAdmin = user.roles.includes('admin');
  if (isAdmin) {
    const administratorScope = targetOrganizationId ?? user.organization_id;
    if (!administratorScope) throw new ApiError(400, 'Organization is required');
    const organization = await db.prepare('SELECT id, name FROM organizations WHERE id = ?').bind(administratorScope).first<{ id: string; name: string }>();
    if (!organization) throw new ApiError(404, 'Organization not found');
    return { user, isAdmin: true, organizationId: organization.id, organizationName: organization.name };
  }

  const scope = await db.prepare(
    `SELECT users.organization_id, organizations.name
     FROM users JOIN organizations ON organizations.id = users.organization_id
     WHERE users.id = ? AND users.organization_role = 'leader'
       AND organizations.leader_user_id = users.id AND organizations.status = 'active'`,
  ).bind(user.id).first<{ organization_id: string; name: string }>();

  if (!user.roles.includes('leader') || !scope) throw new ApiError(403, 'Active Leader access required');
  if (targetOrganizationId && targetOrganizationId !== scope.organization_id) {
    await logScopeDenial(db, user, scope.organization_id, targetOrganizationId);
    throw new ApiError(403, 'Organization scope denied');
  }
  return { user, isAdmin: false, organizationId: scope.organization_id, organizationName: scope.name };
}

export async function requireAdminOrLeader(db: D1Database, request: Request) {
  const user = await getAuthUser(db, request);
  if (!user) throw new ApiError(401, 'Authentication required');
  if (user.roles.includes('admin')) return { user, isAdmin: true };
  if (user.roles.includes('leader')) {
    const scope = await requireOrganizationPermission(db, request);
    return { user, isAdmin: false, organizationId: scope.organizationId };
  }
  throw new ApiError(403, 'Administrator or Leader access required');
}

export { requireAdmin };
