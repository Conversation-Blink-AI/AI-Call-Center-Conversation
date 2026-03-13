import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const callId = searchParams.get("call_id")
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 20) : 5

    if (!callId) {
      return NextResponse.json({ error: "call_id is required" }, { status: 400 })
    }

    const result = await db.query(
      `
      SELECT e.*
      FROM meta_capi_events e
      JOIN call_logs c ON c.call_id = e.call_id
      WHERE c.user_id = $1 AND e.call_id = $2
      ORDER BY e.created_at DESC
      LIMIT $3
      `,
      [user.id, callId, limit]
    )

    return NextResponse.json({ events: result.rows })
  } catch (error: any) {
    console.error("[META-CAPI-EVENTS] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Meta CAPI events", details: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}
