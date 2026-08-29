import { adminRole } from '../../../_lib/admin';
import { requireAdmin } from '../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../_lib/http';

interface UserUpdateBody {
  displayName?: unknown;
  email?: unknown;
  status?: unknown;
  role?: unknown;
  pointsDelta?: unknown;
  pointsReason?: unknown;
  expectedUpdatedAt?: unknown;
}

async function userDetail(db: D1Database, userId: string) {
  const [user, points, activitySummary] = await Promise.all([
    db.prepare(
      `SELECT users.id, users.email, users.display_name, users.username, users.status, users.timezone,
              users.bio, users.preferred_locale, users.email_verified_at, users.avatar_url,
              users.created_at, users.updated_at, users.last_login_at,
              users.organization_id, users.organization_role, users.organization_joined_at,
              organizations.name AS organization_name, organizations.public_id AS organization_public_id,
              COALESCE((SELECT role FROM user_roles WHERE user_roles.user_id = users.id
                ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'leader' THEN 2 WHEN 'operator' THEN 3 WHEN 'member' THEN 4 ELSE 5 END LIMIT 1), 'user') AS role,
              COALESCE((SELECT role FROM user_roles WHERE user_roles.user_id = users.id AND role <> 'leader'
                ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'operator' THEN 2 WHEN 'member' THEN 3 ELSE 4 END LIMIT 1), 'user') AS platform_role,
              COALESCE((SELECT SUM(amount) FROM point_transactions WHERE point_transactions.user_id = users.id), 0) AS points
       FROM users LEFT JOIN organizations ON organizations.id = users.organization_id WHERE users.id = ?`,
    ).bind(userId).first(),
    db.prepare(
      `SELECT id, amount, reason, reference_type, reference_id, created_at
       FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
    ).bind(userId).all(),
    db.prepare(
      `SELECT
         (SELECT COUNT(*) FROM user_activity_events WHERE user_id = ?) AS history,
         (SELECT COUNT(*) FROM user_activity_events WHERE user_id = ? AND category = 'job') AS jobs,
         (SELECT COUNT(*) FROM user_activity_events WHERE user_id = ? AND category = 'interview') AS interviews,
         (SELECT COUNT(*) FROM (
           SELECT course_id FROM enrollments WHERE user_id = ?
           UNION SELECT course_id FROM chapter_progress WHERE user_id = ?
         )) AS courses,
         (SELECT COUNT(*) FROM resume_source_documents WHERE user_id = ? AND source_type = 'upload') AS uploads,
         (SELECT COUNT(*) FROM resume_documents WHERE user_id = ?) AS resumes`,
    ).bind(userId, userId, userId, userId, userId, userId, userId).first(),
  ]);
  return user ? { user, pointTransactions: points.results, activitySummary } : null;
}

export const onRequestGet: PagesFunction<Env, 'userId'> = async ({ request, env, params }) => {
  try {
    await requireAdmin(env.DB, request);
    const userId = typeof params.userId === 'string' ? params.userId : null;
    if (!userId) throw new ApiError(404, 'User not found');
    const detail = await userDetail(env.DB, userId);
    if (!detail) throw new ApiError(404, 'User not found');
    return json(detail);
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPatch: PagesFunction<Env, 'userId'> = async ({ request, env, params }) => {
  try {
    const actor = await requireAdmin(env.DB, request);
    const userId = typeof params.userId === 'string' ? params.userId : null;
    if (!userId) throw new ApiError(404, 'User not found');
    const body = await readJson<UserUpdateBody>(request);
    const displayName = requireString(body.displayName, 'displayName').slice(0, 120);
    const email = requireString(body.email, 'email').toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'A valid email is required');
    const status = body.status === 'suspended' ? 'suspended' : body.status === 'active' ? 'active' : null;
    if (!status) throw new ApiError(400, 'status must be active or suspended');
    const role = adminRole(body.role);
    if (role === 'leader') throw new ApiError(400, 'Assign or revoke Leader from the organization page');
    const expectedUpdatedAt = requireString(body.expectedUpdatedAt, 'expectedUpdatedAt');
    const pointsDelta = typeof body.pointsDelta === 'number' && Number.isInteger(body.pointsDelta) ? body.pointsDelta : 0;
    if (Math.abs(pointsDelta) > 100_000) throw new ApiError(400, 'pointsDelta must be between -100000 and 100000');
    const pointsReason = typeof body.pointsReason === 'string' ? body.pointsReason.trim().slice(0, 240) : '';
    if (pointsDelta !== 0 && !pointsReason) throw new ApiError(400, 'pointsReason is required when changing points');

    const current = await env.DB.prepare('SELECT id, status, updated_at FROM users WHERE id = ?').bind(userId).first<{ id: string; status: string; updated_at: string }>();
    if (!current) throw new ApiError(404, 'User not found');
    if (current.updated_at !== expectedUpdatedAt) throw new ApiError(409, 'This user was updated by someone else. Reload and try again.');
    if (actor.id === userId && (role !== 'admin' || status !== 'active')) {
      throw new ApiError(409, 'You cannot remove or suspend your own administrator access');
    }

    const auditId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(
        `DELETE FROM user_roles
         WHERE user_id = ? AND role <> 'leader' AND EXISTS (SELECT 1 FROM users WHERE id = ? AND updated_at = ?)`,
      ).bind(userId, userId, expectedUpdatedAt),
      env.DB.prepare(
        `INSERT INTO user_roles (user_id, role)
         SELECT id, ? FROM users WHERE id = ? AND updated_at = ?`,
      ).bind(role, userId, expectedUpdatedAt),
    ];
    if (pointsDelta !== 0) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO point_transactions (id, user_id, amount, reason, reference_type, reference_id)
           SELECT ?, id, ?, ?, 'admin_adjustment', ? FROM users WHERE id = ? AND updated_at = ?`,
        ).bind(crypto.randomUUID(), pointsDelta, pointsReason, auditId, userId, expectedUpdatedAt),
      );
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO admin_audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json)
         SELECT ?, ?, 'user.updated', 'user', id, ? FROM users WHERE id = ? AND updated_at = ?`,
      ).bind(auditId, actor.id, JSON.stringify({ role, status, pointsDelta, pointsReason: pointsReason || null }), userId, expectedUpdatedAt),
      env.DB.prepare(
        `UPDATE users SET display_name = ?, email = ?, status = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
         WHERE id = ? AND updated_at = ?`,
      ).bind(displayName, email, status, userId, expectedUpdatedAt),
    );

    try {
      const results = await env.DB.batch(statements);
      if (!Number(results[results.length - 1]?.meta.changes ?? 0)) {
        throw new ApiError(409, 'This user was updated by someone else. Reload and try again.');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new ApiError(409, 'That email address is already in use');
      }
      throw error;
    }

    return json(await userDetail(env.DB, userId));
  } catch (error) {
    return errorResponse(error);
  }
};
