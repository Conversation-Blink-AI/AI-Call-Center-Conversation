import { db } from "@/lib/db"
import { CallDatabaseService } from "@/services/call-database-service"

export type AnalyticsDateBounds = {
  rangeStart: Date | null
  rangeEnd: Date | null
}

export type CallAnalyticsStats = {
  totalCalls: number
  completedCalls: number
  failedCalls: number
  transferredCalls: number
  totalDuration: number
  totalCost: number
  averageDuration: number
  successRate: number
  qualifiedLeadsRate: number
  averageCostPerCall: number
  callsThisWeek: number
  callsThisMonth: number
  costThisWeek: number
  costThisMonth: number
  volumeSeries: { date: string; count: number }[]
  qualifiedLeadsSeries: { date: string; count: number }[]
}

export type CallAnalyticsTimeframeCounts = {
  today: number
  yesterday: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
}

export type MetaCapiAnalyticsStats = {
  eventsFired: number
  eventsSuccessful: number
  eventsFailed: number
  successRate: number
  lastEventFired: string | null
}

export type MetaCapiSeriesPoint = {
  date: string
  fired: number
  success: number
  failed: number
}

function emptyUserIdsGuard(userIds: string[]) {
  return userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]
}

function buildComparisonDates(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastWeekEnd = new Date(thisWeekStart.getTime() - 1)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1)

  return {
    today,
    yesterday,
    thisWeekStart,
    lastWeekStart,
    lastWeekEnd,
    thisMonthStart,
    lastMonthStart,
    lastMonthEnd,
  }
}

async function getEnhancedStatsForUserIds(
  userIds: string[],
  dates: ReturnType<typeof buildComparisonDates> & AnalyticsDateBounds,
) {
  const scopedUserIds = emptyUserIdsGuard(userIds)
  const rangeStart = dates.rangeStart ? dates.rangeStart.toISOString() : null
  const rangeEnd = dates.rangeEnd ? dates.rangeEnd.toISOString() : null

  const queries = await Promise.all([
    db.query(
      `SELECT COUNT(*) as count, 0 as cost
       FROM call_logs
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2
         AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
         AND ($4::timestamptz IS NULL OR created_at <= $4::timestamptz)`,
      [scopedUserIds, dates.today.toISOString(), rangeStart, rangeEnd],
    ),
    db.query(
      `SELECT COUNT(*) as count, 0 as cost
       FROM call_logs
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2 AND created_at < $3
         AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
         AND ($5::timestamptz IS NULL OR created_at <= $5::timestamptz)`,
      [scopedUserIds, dates.yesterday.toISOString(), dates.today.toISOString(), rangeStart, rangeEnd],
    ),
    db.query(
      `SELECT COUNT(*) as count, 0 as cost
       FROM call_logs
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2
         AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
         AND ($4::timestamptz IS NULL OR created_at <= $4::timestamptz)`,
      [scopedUserIds, dates.thisWeekStart.toISOString(), rangeStart, rangeEnd],
    ),
    db.query(
      `SELECT COUNT(*) as count, 0 as cost
       FROM call_logs
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2 AND created_at <= $3
         AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
         AND ($5::timestamptz IS NULL OR created_at <= $5::timestamptz)`,
      [scopedUserIds, dates.lastWeekStart.toISOString(), dates.lastWeekEnd.toISOString(), rangeStart, rangeEnd],
    ),
    db.query(
      `SELECT COUNT(*) as count, 0 as cost
       FROM call_logs
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2
         AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
         AND ($4::timestamptz IS NULL OR created_at <= $4::timestamptz)`,
      [scopedUserIds, dates.thisMonthStart.toISOString(), rangeStart, rangeEnd],
    ),
    db.query(
      `SELECT COUNT(*) as count, 0 as cost
       FROM call_logs
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2 AND created_at <= $3
         AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
         AND ($5::timestamptz IS NULL OR created_at <= $5::timestamptz)`,
      [scopedUserIds, dates.lastMonthStart.toISOString(), dates.lastMonthEnd.toISOString(), rangeStart, rangeEnd],
    ),
  ])

  return {
    callsToday: parseInt(queries[0].rows[0].count, 10),
    costToday: parseInt(queries[0].rows[0].cost, 10),
    callsYesterday: parseInt(queries[1].rows[0].count, 10),
    costYesterday: parseInt(queries[1].rows[0].cost, 10),
    callsThisWeek: parseInt(queries[2].rows[0].count, 10),
    costThisWeek: parseInt(queries[2].rows[0].cost, 10),
    callsLastWeek: parseInt(queries[3].rows[0].count, 10),
    costLastWeek: parseInt(queries[3].rows[0].cost, 10),
    callsThisMonth: parseInt(queries[4].rows[0].count, 10),
    costThisMonth: parseInt(queries[4].rows[0].cost, 10),
    callsLastMonth: parseInt(queries[5].rows[0].count, 10),
    costLastMonth: parseInt(queries[5].rows[0].cost, 10),
  }
}

async function getCallVolumeSeriesForUserIds(userIds: string[], dates: AnalyticsDateBounds) {
  const scopedUserIds = emptyUserIdsGuard(userIds)
  const rangeStart = dates.rangeStart ? dates.rangeStart.toISOString() : null
  const rangeEnd = dates.rangeEnd ? dates.rangeEnd.toISOString() : null

  const result = await db.query(
    `SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) AS count
     FROM call_logs
     WHERE user_id = ANY($1::uuid[])
       AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
     GROUP BY day
     ORDER BY day ASC`,
    [scopedUserIds, rangeStart, rangeEnd],
  )

  return result.rows.map((row: { day: string; count: string }) => ({
    date: row.day,
    count: parseInt(row.count, 10),
  }))
}

async function getQualifiedLeadsSeriesForUserIds(userIds: string[], dates: AnalyticsDateBounds) {
  const scopedUserIds = emptyUserIdsGuard(userIds)
  const rangeStart = dates.rangeStart ? dates.rangeStart.toISOString() : null
  const rangeEnd = dates.rangeEnd ? dates.rangeEnd.toISOString() : null

  const result = await db.query(
    `SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) AS count
     FROM call_logs
     WHERE user_id = ANY($1::uuid[])
       AND (
         (transferred_to IS NOT NULL AND TRIM(transferred_to) != '')
         OR ended_reason ILIKE '%transfer%'
         OR ended_reason ILIKE '%transferred%'
         OR ended_reason ILIKE '%transfered%'
       )
       AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
     GROUP BY day
     ORDER BY day ASC`,
    [scopedUserIds, rangeStart, rangeEnd],
  )

  return result.rows.map((row: { day: string; count: string }) => ({
    date: row.day,
    count: parseInt(row.count, 10),
  }))
}

export async function getCallAnalyticsForUserIds(
  userIds: string[],
  bounds: AnalyticsDateBounds,
): Promise<{ stats: CallAnalyticsStats; timeframeCounts: CallAnalyticsTimeframeCounts }> {
  const now = new Date()
  const isAllTime = !bounds.rangeStart && !bounds.rangeEnd
  const comparisonDates = {
    ...buildComparisonDates(now),
    rangeStart: bounds.rangeStart,
    rangeEnd: isAllTime ? null : bounds.rangeEnd ?? now,
  }

  const basicStats = await CallDatabaseService.getCallStatsForUserIds(userIds, {
    startDate: bounds.rangeStart ? bounds.rangeStart.toISOString() : undefined,
    endDate: isAllTime ? undefined : (bounds.rangeEnd ?? now).toISOString(),
  })

  const enhancedStats = await getEnhancedStatsForUserIds(userIds, comparisonDates)
  const volumeSeries = await getCallVolumeSeriesForUserIds(userIds, {
    rangeStart: bounds.rangeStart,
    rangeEnd: isAllTime ? null : bounds.rangeEnd ?? now,
  })
  const qualifiedLeadsSeries = await getQualifiedLeadsSeriesForUserIds(userIds, {
    rangeStart: bounds.rangeStart,
    rangeEnd: isAllTime ? null : bounds.rangeEnd ?? now,
  })

  const averageDuration =
    basicStats.totalCalls > 0 ? Math.round(basicStats.totalDuration / basicStats.totalCalls) : 0
  const successRate =
    basicStats.totalCalls > 0 ? (basicStats.completedCalls / basicStats.totalCalls) * 100 : 0
  const qualifiedLeadsRate =
    basicStats.totalCalls > 0 ? (basicStats.transferredCalls / basicStats.totalCalls) * 100 : 0
  const averageCostPerCall =
    basicStats.totalCalls > 0 ? Math.round(basicStats.totalCost / basicStats.totalCalls) : 0

  return {
    stats: {
      ...basicStats,
      averageDuration,
      successRate,
      qualifiedLeadsRate,
      averageCostPerCall,
      callsThisWeek: enhancedStats.callsThisWeek,
      callsThisMonth: enhancedStats.callsThisMonth,
      costThisWeek: enhancedStats.costThisWeek,
      costThisMonth: enhancedStats.costThisMonth,
      volumeSeries,
      qualifiedLeadsSeries,
    },
    timeframeCounts: {
      today: enhancedStats.callsToday,
      yesterday: enhancedStats.callsYesterday,
      thisWeek: enhancedStats.callsThisWeek,
      lastWeek: enhancedStats.callsLastWeek,
      thisMonth: enhancedStats.callsThisMonth,
      lastMonth: enhancedStats.callsLastMonth,
    },
  }
}

export async function getMetaCapiAnalyticsForUserIds(
  userIds: string[],
  bounds: AnalyticsDateBounds,
): Promise<{ stats: MetaCapiAnalyticsStats; series: MetaCapiSeriesPoint[] }> {
  const scopedUserIds = emptyUserIdsGuard(userIds)
  const startIso = bounds.rangeStart?.toISOString() ?? null
  const endIso = bounds.rangeEnd?.toISOString() ?? null

  const statsResult = await db.query(
    `SELECT
       COUNT(*)::int AS events_fired,
       COUNT(*) FILTER (WHERE e.response_status IS NOT NULL AND e.response_status < 300)::int AS events_successful,
       COUNT(*) FILTER (WHERE e.response_status IS NULL OR e.response_status >= 300)::int AS events_failed,
       MAX(e.created_at) AS last_event_fired
     FROM meta_capi_events e
     JOIN call_logs c ON c.call_id = e.call_id
     WHERE c.user_id = ANY($1::uuid[])
       AND ($2::timestamptz IS NULL OR e.created_at >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR e.created_at <= $3::timestamptz)`,
    [scopedUserIds, startIso, endIso],
  )

  const seriesResult = await db.query(
    `SELECT
       DATE_TRUNC('day', e.created_at) AS day,
       COUNT(*)::int AS fired,
       COUNT(*) FILTER (WHERE e.response_status IS NOT NULL AND e.response_status < 300)::int AS success,
       COUNT(*) FILTER (WHERE e.response_status IS NULL OR e.response_status >= 300)::int AS failed
     FROM meta_capi_events e
     JOIN call_logs c ON c.call_id = e.call_id
     WHERE c.user_id = ANY($1::uuid[])
       AND ($2::timestamptz IS NULL OR e.created_at >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR e.created_at <= $3::timestamptz)
     GROUP BY day
     ORDER BY day ASC`,
    [scopedUserIds, startIso, endIso],
  )

  const row = statsResult.rows[0]
  const eventsFired = row?.events_fired ?? 0
  const eventsSuccessful = row?.events_successful ?? 0
  const eventsFailed = row?.events_failed ?? 0
  const successRate = eventsFired > 0 ? (eventsSuccessful / eventsFired) * 100 : 0

  return {
    stats: {
      eventsFired,
      eventsSuccessful,
      eventsFailed,
      successRate,
      lastEventFired: row?.last_event_fired ?? null,
    },
    series: seriesResult.rows.map(
      (s: { day: string; fired: number; success: number; failed: number }) => ({
        date: s.day,
        fired: s.fired,
        success: s.success,
        failed: s.failed,
      }),
    ),
  }
}
