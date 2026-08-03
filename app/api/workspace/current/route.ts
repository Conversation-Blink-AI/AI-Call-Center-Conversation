import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getPool } from "@/lib/db-client"
import {
  clearWorkspaceOrgIdOnResponse,
  getCurrentWorkspaceSummary,
  getWorkspaceOrgIdFromRequest,
} from "@/lib/workspace-context"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceOrgId = getWorkspaceOrgIdFromRequest(request)
    if (!workspaceOrgId) {
      return NextResponse.json({ workspace: null })
    }

    const pool = getPool()
    const summary = await getCurrentWorkspaceSummary(user, workspaceOrgId, pool)

    if (!summary) {
      const response = NextResponse.json({ workspace: null })
      clearWorkspaceOrgIdOnResponse(response)
      return response
    }

    return NextResponse.json({ workspace: summary })
  } catch (error) {
    console.error("[WORKSPACE/CURRENT] Error:", error)
    return NextResponse.json({ error: "Failed to load workspace" }, { status: 500 })
  }
}
