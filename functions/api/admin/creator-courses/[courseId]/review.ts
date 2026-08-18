import { requireAdmin } from '../../../../_lib/auth';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../../_lib/http';
import { awardBadge, createNotification, grantPoints } from '../../../../_lib/userRewards';
import { sendCreatorReviewEmail } from '../../../../_lib/email';
import { enqueueCreatorCourseKnowledge } from '../../../../_lib/knowledgeGraph';

interface ReviewBody { decision?: unknown; note?: unknown; }

export const onRequestPost: PagesFunction<Env, 'courseId'> = async ({ request, env, params }) => {
  try {
    const admin = await requireAdmin(env.DB, request);
    const courseId = params.courseId;
    if (!courseId) throw new ApiError(404, 'Course not found');
    const body = await readJson<ReviewBody>(request);
    const decision = requireString(body.decision, 'decision');
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1_000) : '';
    if (!['recommended', 'changes_requested'].includes(decision)) throw new ApiError(400, 'decision must be recommended or changes_requested');
    const course = await env.DB.prepare(
      `SELECT creator_courses.id, creator_courses.creator_user_id, creator_courses.title, creator_courses.status, creator_courses.body_markdown,
              users.email AS creator_email, users.username AS creator_username, users.preferred_locale AS creator_locale
       FROM creator_courses JOIN users ON users.id = creator_courses.creator_user_id WHERE creator_courses.id = ?`,
    ).bind(courseId).first<{ id: string; creator_user_id: string; title: string; status: string; body_markdown: string; creator_email: string; creator_username: string | null; creator_locale: string | null }>();
    if (!course || course.status !== 'submitted') throw new ApiError(409, 'Only submitted courses can be reviewed');

    const points = decision === 'recommended' ? 200 : 0;
    await env.DB
      .prepare(
        `UPDATE creator_courses SET status = ?, reviewer_user_id = ?, review_note = ?,
         recommended_at = CASE WHEN ? = 'recommended' THEN CURRENT_TIMESTAMP ELSE NULL END,
         points_awarded = CASE WHEN ? = 'recommended' THEN ? ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .bind(decision, admin.id, note || null, decision, decision, points, course.id)
      .run();
    if (decision === 'recommended') {
      await grantPoints(env.DB, { userId: course.creator_user_id, amount: points, reason: 'Recommended community course', referenceType: 'creator_course_recommendation', referenceId: course.id });
      await awardBadge(env.DB, { userId: course.creator_user_id, slug: 'course-creator', reason: 'A course was recommended after quality review' });
      // Community courses add concepts and graph relationships immediately;
      // their public lesson route is added only when they enter the catalogue.
      await enqueueCreatorCourseKnowledge(env.DB, course.id, course.body_markdown);
    }
    await createNotification(env.DB, {
      userId: course.creator_user_id,
      kind: 'creator_review',
      title: decision === 'recommended' ? 'Your course was recommended' : 'Your course needs changes',
      body: decision === 'recommended' ? `${course.title} was recommended and earned ${points} points.` : (note || `${course.title} needs updates before another review.`),
      actionUrl: '/me/creator',
    });
    await sendCreatorReviewEmail(env, course.creator_email, {
      username: course.creator_username ?? undefined,
      locale: course.creator_locale === 'zh-TW' || course.creator_locale === 'en' || course.creator_locale === 'fr' || course.creator_locale === 'es' ? course.creator_locale : 'zh-CN',
      userId: course.creator_user_id,
      courseId: course.id,
      courseTitle: course.title,
      recommended: decision === 'recommended',
      reviewNote: note || undefined,
      creatorUrl: `${env.APP_ORIGIN || 'https://studyai.now'}/me/creator`,
    }).catch((emailError) => console.error('Creator review email failed', emailError));
    return json({ ok: true, status: decision, points });
  } catch (error) {
    return errorResponse(error);
  }
};
