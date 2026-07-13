import { NextRequest } from "next/server"
import { resolveAnalyticsDateRange } from "@/lib/analytics-date-range"
import { getPool } from "@/lib/db-client"
import { ensureForexOrgTables } from "@/lib/forex-org-sync"
import {
  getCallAnalyticsForUserIds,
  getMetaCapiAnalyticsForUserIds,
} from "@/lib/org-analytics"
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/lib/public-api-cors"
import {
  resolveOrgAdminContext,
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
    const orgIdParam = searchParams.get("orgId")?.trim() || null

    if (!emailParam || !userIdParam) {
      return publicApiJsonResponse(
        { success: false, message: "email and userId are required" },
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
    await ensureForexOrgTables(pool)

    const userResult = await verifyPublicApiUser(pool, emailParam, userIdParam)
    if ("error" in userResult) {
      return publicApiJsonResponse(
        { success: false, message: userResult.error.message },
        userResult.error.status,
      )
    }

    const { start: rangeStart, end: rangeEnd } = resolveAnalyticsDateRange(searchParams)
    const isAllTime = !rangeStart && !rangeEnd
    const now = new Date()
    const bounds = {
      rangeStart,
      rangeEnd: isAllTime ? null : (rangeEnd ?? now),
    }

    // Personal mode: email + userId only → requester's own analytics
    if (!orgIdParam) {
      const scopedUserIds = [userResult.user.id]
      const [{ stats, timeframeCounts }, metaCapi] = await Promise.all([
        getCallAnalyticsForUserIds(scopedUserIds, bounds),
        getMetaCapiAnalyticsForUserIds(scopedUserIds, bounds),
      ])

      return publicApiJsonResponse({
        success: true,
        orgId: null,
        email: userResult.user.email,
        userId: userResult.user.id,
        scopedTo: "self",
        scopedUserCount: 1,
        dateRange: {
          start: bounds.rangeStart?.toISOString() ?? null,
          end: bounds.rangeEnd?.toISOString() ?? null,
        },
        stats,
        timeframeCounts,
        metaCapi,
      })
    }

    // Org mode: any active member → organization_admin analytics only
    const orgContext = await resolveOrgAdminContext(pool, orgIdParam, userResult.user)
    if ("error" in orgContext) {
      return publicApiJsonResponse(
        { success: false, message: orgContext.error.message },
        orgContext.error.status,
      )
    }

    const scopedUserIds = [orgContext.admin.userId]
    const [{ stats, timeframeCounts }, metaCapi] = await Promise.all([
      getCallAnalyticsForUserIds(scopedUserIds, bounds),
      getMetaCapiAnalyticsForUserIds(scopedUserIds, bounds),
    ])

    return publicApiJsonResponse({
      success: true,
      orgId: orgIdParam,
      email: userResult.user.email,
      userId: userResult.user.id,
      scopedTo: "organization_admin",
      scopedUserCount: 1,
      analyticsOwnerUserId: orgContext.admin.userId,
      analyticsOwnerEmail: orgContext.admin.email,
      analyticsOwnerSource: orgContext.admin.source,
      requesterRole:
        orgContext.membership.call_center_role || orgContext.membership.role,
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
