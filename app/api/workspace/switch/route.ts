import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getPool } from "@/lib/db-client"
import {
  setWorkspaceOrgIdOnResponse,
  switchToWorkspace,
} from "@/lib/workspace-context"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const orgId = typeof body.orgId === "string" ? body.orgId.trim() : ""

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 })
    }

    const pool = getPool()
    const result = await switchToWorkspace(pool, user, orgId)

    if ("error" in result) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status })
    }

    const response = NextResponse.json({
      success: true,
      workspace: result.summary,
    })
    setWorkspaceOrgIdOnResponse(response, result.summary.orgId)
    return response
  } catch (error) {
    console.error("[WORKSPACE/SWITCH] Error:", error)
    return NextResponse.json({ error: "Failed to switch workspace" }, { status: 500 })
  }
}
