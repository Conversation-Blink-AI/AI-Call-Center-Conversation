import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { resolveAnalyticsDateRange } from "@/lib/analytics-date-range"
import { getMetaCapiAnalyticsForUserIds } from "@/lib/org-analytics"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { start, end } = resolveAnalyticsDateRange(searchParams)

    const { stats, series } = await getMetaCapiAnalyticsForUserIds([user.id], {
      rangeStart: start,
      rangeEnd: end,
    })

    return NextResponse.json({
      success: true,
      stats,
      series,
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
