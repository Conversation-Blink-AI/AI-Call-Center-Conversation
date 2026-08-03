import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, validateAuthToken } from "@/lib/auth-utils"
import { CallCostService } from "@/services/call-cost-service"
import {
  getWorkspaceOrgIdFromCookies,
  resolveDashboardResourceOwner,
} from "@/lib/workspace-context"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [CALL-COSTS] Fetching call costs...")

    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      console.log("🚨 [CALL-COSTS] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authUser = (await getCurrentUser()) || authResult.user
    const workspaceOrgId = await getWorkspaceOrgIdFromCookies()
    const owner = await resolveDashboardResourceOwner(authUser, workspaceOrgId)
    const userId = owner.userId
    console.log(
      `✅ [CALL-COSTS] User authenticated: auth=${authUser.id}, resource=${userId}, mode=${owner.mode}`,
    )

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)

    const callCosts = await CallCostService.getCallCosts(userId, limit)

    console.log(`✅ [CALL-COSTS] Found ${callCosts.length} call costs for user ${userId}`)

    return NextResponse.json({
      success: true,
      callCosts,
      count: callCosts.length,
      userId,
      workspace_mode: owner.mode,
    })
  } catch (error: any) {
    console.error("❌ [CALL-COSTS] Error fetching call costs:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
