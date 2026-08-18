export async function grantPoints(
  db: D1Database,
  input: { userId: string; amount: number; reason: string; referenceType: string; referenceId: string },
) {
  const existing = await db
    .prepare('SELECT id FROM point_transactions WHERE user_id = ? AND reference_type = ? AND reference_id = ? LIMIT 1')
    .bind(input.userId, input.referenceType, input.referenceId)
    .first<{ id: string }>();
  if (existing) return false;

  await db
    .prepare(
      `INSERT INTO point_transactions (id, user_id, amount, reason, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), input.userId, input.amount, input.reason, input.referenceType, input.referenceId)
    .run();
  return true;
}

export async function awardBadge(
  db: D1Database,
  input: { userId: string; slug: string; reason: string },
) {
  const badge = await db.prepare('SELECT id FROM badges WHERE slug = ?').bind(input.slug).first<{ id: string }>();
  if (!badge) return false;

  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO user_badges (user_id, badge_id, awarded_reason)
       VALUES (?, ?, ?)`,
    )
    .bind(input.userId, badge.id, input.reason)
    .run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function createNotification(
  db: D1Database,
  input: { userId: string; kind: 'learning_reminder' | 'course_update' | 'creator_review' | 'career_plan'; title: string; body: string; actionUrl?: string },
) {
  await db
    .prepare(
      `INSERT INTO user_notifications (id, user_id, kind, title, body, action_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), input.userId, input.kind, input.title, input.body, input.actionUrl ?? null)
    .run();
}
