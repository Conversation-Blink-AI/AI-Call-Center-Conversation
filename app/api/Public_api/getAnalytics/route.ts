import { NextRequest } from "next/server"
import { resolveAnalyticsDateRange } from "@/lib/analytics-date-range"
import { resolveAnalyticsScope } from "@/lib/call-center-permissions"
import { getPool } from "@/lib/db-client"
import {
  getCallAnalyticsForUserIds,
  getMetaCapiAnalyticsForUserIds,
} from "@/lib/org-analytics"
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/lib/public-api-cors"
import {
  resolveOrgScopedUserIds,
  verifyOrgMembership,
  verifyPublicApiUser,
} from "@/lib/public-api-verify"

export async function OPTIONS(_request: NextRequest) {
  return publicApiOptionsResponse()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")
    const userIdParam = searchParams.get("userId")
    const orgIdParam = searchParams.get("orgId")

    if (!emailParam || !userIdParam || !orgIdParam) {
      return publicApiJsonResponse(
        { success: false, message: "email, userId, and orgId are required" },
        400,
      )
    }

    if (!process.env.DATABASE_URL) {
      return publicApiJsonResponse(
        { success: false, message: "Database configuration error" },
        500,
      )
    }

    const pool = getPool()
    const userResult = await verifyPublicApiUser(pool, emailParam, userIdParam)
    if ("error" in userResult) {
      return publicApiJsonResponse(
        { success: false, message: userResult.error.message },
        userResult.error.status,
      )
    }

    const membershipResult = await verifyOrgMembership(pool, orgIdParam, userResult.user)
    if ("error" in membershipResult) {
      return publicApiJsonResponse(
        { success: false, message: membershipResult.error.message },
        membershipResult.error.status,
      )
    }

    const scope = resolveAnalyticsScope(membershipResult.membership)
    if (!scope) {
      return publicApiJsonResponse(
        { success: false, message: "You do not have permission to view organization analytics" },
        403,
      )
    }

    const scopedUserIds = await resolveOrgScopedUserIds(
      pool,
      orgIdParam,
      membershipResult.membership,
      userResult.user.id,
      scope,
    )

    const { start: rangeStart, end: rangeEnd } = resolveAnalyticsDateRange(searchParams)
    const isAllTime = !rangeStart && !rangeEnd
    const now = new Date()
    const bounds = {
      rangeStart,
      rangeEnd: isAllTime ? null : (rangeEnd ?? now),
    }

    const [{ stats, timeframeCounts }, metaCapi] = await Promise.all([
      getCallAnalyticsForUserIds(scopedUserIds, bounds),
      getMetaCapiAnalyticsForUserIds(scopedUserIds, bounds),
    ])

    return publicApiJsonResponse({
      success: true,
      orgId: orgIdParam,
      email: userResult.user.email,
      userId: userResult.user.id,
      scopedTo: scope,
      scopedUserCount: scopedUserIds.length,
      dateRange: {
        start: bounds.rangeStart?.toISOString() ?? null,
        end: bounds.rangeEnd?.toISOString() ?? null,
      },
      stats,
      timeframeCounts,
      metaCapi,
    })
  } catch (error: unknown) {
    console.error("[GET-ANALYTICS] Error:", error)
    return publicApiJsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    )
  }
}
