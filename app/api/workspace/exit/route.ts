import { NextResponse } from "next/server"
import { clearWorkspaceOrgIdOnResponse } from "@/lib/workspace-context"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      workspace: null,
    })
    clearWorkspaceOrgIdOnResponse(response)
    return response
  } catch (error) {
    console.error("[WORKSPACE/EXIT] Error:", error)
    return NextResponse.json({ error: "Failed to exit workspace" }, { status: 500 })
  }
}
