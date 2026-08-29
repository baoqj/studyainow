import { ADMIN_INTERVIEW_SETS } from '../../../_lib/interviewCatalog';
import { ApiError, clampInt, errorResponse, json } from '../../../_lib/http';
import { requireAdminOrLeader } from '../../../_lib/organizations';

type AggregateRow = {
  entity_id: string;
  total_views: number;
  unique_users: number;
  views_7d: number;
  views_30d: number;
  set_views: number;
  level_views: number;
  question_views: number;
  last_viewed_at: string | null;
};

const numberValue = (value: unknown) => Number(value ?? 0);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const actor = await requireAdminOrLeader(env.DB, request);
    const url = new URL(request.url);
    const requestedSetId = url.searchParams.get('setId')?.trim() ?? '';
    const page = clampInt(url.searchParams.get('page'), 1, 10_000, 1);
    const limit = clampInt(url.searchParams.get('limit'), 10, 100, 40);
    const selectedDefinition = requestedSetId
      ? ADMIN_INTERVIEW_SETS.find((set) => set.id === requestedSetId)
      : ADMIN_INTERVIEW_SETS[0];

    if (!selectedDefinition) throw new ApiError(404, 'Interview set not found');

    if (!actor.isAdmin) {
      const emptyStats = { totalViews: 0, uniqueUsers: 0, views7d: 0, views30d: 0, setViews: 0, levelViews: 0, questionViews: 0, lastViewedAt: null };
      const sets = ADMIN_INTERVIEW_SETS.map((definition) => ({ ...definition, stats: emptyStats }));
      return json({
        readOnly: true,
        summary: { totalViews: 0, uniqueUsers: 0, views30d: 0, activeSets: sets.length },
        sets,
        selected: sets.find((set) => set.id === selectedDefinition.id),
        trend: [],
        topPages: [],
        history: { items: [], total: 0, page, limit },
      });
    }

    const [aggregateResult, globalSummary] = await Promise.all([
      env.DB.prepare(
        `SELECT entity_id,
                COUNT(*) AS total_views,
                COUNT(DISTINCT user_id) AS unique_users,
                SUM(CASE WHEN occurred_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS views_7d,
                SUM(CASE WHEN occurred_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS views_30d,
                SUM(CASE WHEN route = '/interviews/' || entity_id THEN 1 ELSE 0 END) AS set_views,
                SUM(CASE WHEN route LIKE '/interviews/%/levels/%' AND route NOT LIKE '%/questions/%' THEN 1 ELSE 0 END) AS level_views,
                SUM(CASE WHEN route LIKE '/interviews/%/levels/%/questions/%' THEN 1 ELSE 0 END) AS question_views,
                MAX(occurred_at) AS last_viewed_at
         FROM user_activity_events
         WHERE category = 'interview' AND entity_id IS NOT NULL
         GROUP BY entity_id`,
      ).all<AggregateRow>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS total_views,
                COUNT(DISTINCT user_id) AS unique_users,
                SUM(CASE WHEN occurred_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS views_30d,
                COUNT(DISTINCT entity_id) AS active_sets
         FROM user_activity_events
         WHERE category = 'interview'`,
      ).first<Record<string, number>>(),
    ]);

    const aggregateBySet = new Map(aggregateResult.results.map((row) => [row.entity_id, row]));
    const sets = ADMIN_INTERVIEW_SETS.map((definition) => {
      const stats = aggregateBySet.get(definition.id);
      return {
        ...definition,
        stats: {
          totalViews: numberValue(stats?.total_views),
          uniqueUsers: numberValue(stats?.unique_users),
          views7d: numberValue(stats?.views_7d),
          views30d: numberValue(stats?.views_30d),
          setViews: numberValue(stats?.set_views),
          levelViews: numberValue(stats?.level_views),
          questionViews: numberValue(stats?.question_views),
          lastViewedAt: stats?.last_viewed_at ?? null,
        },
      };
    });
    const selected = sets.find((set) => set.id === selectedDefinition.id)!;

    const [trend, topPages, historyTotal, history] = await Promise.all([
      env.DB.prepare(
        `WITH RECURSIVE days(day) AS (
           VALUES(date('now', '-29 days'))
           UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < date('now')
         )
         SELECT days.day,
                COUNT(events.id) AS views,
                COUNT(DISTINCT events.user_id) AS visitors
         FROM days
         LEFT JOIN user_activity_events events
           ON events.category = 'interview'
          AND events.entity_id = ?
          AND date(events.occurred_at) = days.day
         GROUP BY days.day
         ORDER BY days.day`,
      ).bind(selected.id).all(),
      env.DB.prepare(
        `SELECT route, MAX(page_title) AS page_title,
                COUNT(*) AS views,
                COUNT(DISTINCT user_id) AS unique_users,
                MAX(occurred_at) AS last_viewed_at
         FROM user_activity_events
         WHERE category = 'interview' AND entity_id = ?
         GROUP BY route
         ORDER BY views DESC, last_viewed_at DESC
         LIMIT 10`,
      ).bind(selected.id).all(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count
         FROM user_activity_events
         WHERE category = 'interview' AND entity_id = ?`,
      ).bind(selected.id).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT events.id, events.user_id, events.page_title, events.route, events.occurred_at,
                users.display_name, users.email
         FROM user_activity_events events
         JOIN users ON users.id = events.user_id
         WHERE events.category = 'interview' AND events.entity_id = ?
         ORDER BY events.occurred_at DESC, events.id DESC
         LIMIT ? OFFSET ?`,
      ).bind(selected.id, limit, (page - 1) * limit).all(),
    ]);

    return json({
      summary: {
        totalViews: numberValue(globalSummary?.total_views),
        uniqueUsers: numberValue(globalSummary?.unique_users),
        views30d: numberValue(globalSummary?.views_30d),
        activeSets: numberValue(globalSummary?.active_sets),
      },
      sets,
      selected,
      trend: trend.results,
      topPages: topPages.results,
      history: {
        items: history.results,
        total: numberValue(historyTotal?.count),
        page,
        limit,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
