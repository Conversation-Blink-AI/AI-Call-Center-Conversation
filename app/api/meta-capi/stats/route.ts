import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { resolveAnalyticsDateRange } from "@/lib/analytics-date-range"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { start, end } = resolveAnalyticsDateRange(searchParams)

    const startIso = start?.toISOString() ?? null
    const endIso = end?.toISOString() ?? null

    const statsResult = await db.query(
      `
      SELECT
        COUNT(*)::int AS events_fired,
        COUNT(*) FILTER (WHERE e.response_status IS NOT NULL AND e.response_status < 300)::int AS events_successful,
        COUNT(*) FILTER (WHERE e.response_status IS NULL OR e.response_status >= 300)::int AS events_failed,
        MAX(e.created_at) AS last_event_fired
      FROM meta_capi_events e
      JOIN call_logs c ON c.call_id = e.call_id
      WHERE c.user_id = $1
        AND ($2::timestamptz IS NULL OR e.created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR e.created_at <= $3::timestamptz)
      `,
      [user.id, startIso, endIso]
    )

    const seriesResult = await db.query(
      `
      SELECT
        DATE_TRUNC('day', e.created_at) AS day,
        COUNT(*)::int AS fired,
        COUNT(*) FILTER (WHERE e.response_status IS NOT NULL AND e.response_status < 300)::int AS success,
        COUNT(*) FILTER (WHERE e.response_status IS NULL OR e.response_status >= 300)::int AS failed
      FROM meta_capi_events e
      JOIN call_logs c ON c.call_id = e.call_id
      WHERE c.user_id = $1
        AND ($2::timestamptz IS NULL OR e.created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR e.created_at <= $3::timestamptz)
      GROUP BY day
      ORDER BY day ASC
      `,
      [user.id, startIso, endIso]
    )

    const row = statsResult.rows[0]
    const eventsFired = row?.events_fired ?? 0
    const eventsSuccessful = row?.events_successful ?? 0
    const eventsFailed = row?.events_failed ?? 0
    const successRate =
      eventsFired > 0 ? (eventsSuccessful / eventsFired) * 100 : 0

    return NextResponse.json({
      success: true,
      stats: {
        eventsFired,
        eventsSuccessful,
        eventsFailed,
        successRate,
        lastEventFired: row?.last_event_fired ?? null,
      },
      series: seriesResult.rows.map((s: { day: string; fired: number; success: number; failed: number }) => ({
        date: s.day,
        fired: s.fired,
        success: s.success,
        failed: s.failed,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[META-CAPI-STATS] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Meta CAPI stats", details: message },
      { status: 500 }
    )
  }
}
