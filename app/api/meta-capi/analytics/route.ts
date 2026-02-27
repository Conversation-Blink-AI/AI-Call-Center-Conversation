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
    const phoneNumber = searchParams.get("phone_number")
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    if (!phoneNumber) {
      return NextResponse.json({ error: "phone_number is required" }, { status: 400 })
    }

    const configsResult = await db.query(
      `
      SELECT id, nickname
      FROM meta_capi_configs
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [user.id]
    )

    const values: any[] = [user.id, phoneNumber]
    let whereClause = "pn.user_id = $1 AND pn.phone_number = $2"
    let paramIndex = 2

    if (start) {
      paramIndex += 1
      values.push(start)
      whereClause += ` AND e.created_at >= $${paramIndex}`
    }
    if (end) {
      paramIndex += 1
      values.push(end)
      whereClause += ` AND e.created_at <= $${paramIndex}`
    }

    const eventsResult = await db.query(
      `
      SELECT
        to_char(date_trunc('day', e.created_at), 'YYYY-MM-DD') as day,
        e.config_id,
        COUNT(*)::int as count
      FROM meta_capi_events e
      JOIN call_logs c ON c.call_id = e.call_id
      JOIN phone_numbers pn ON pn.phone_number = c.to_number
      WHERE ${whereClause}
      GROUP BY day, e.config_id
      ORDER BY day ASC
      `,
      values
    )

    return NextResponse.json({
      configs: configsResult.rows,
      series: eventsResult.rows
    })
  } catch (error: any) {
    console.error("[META-CAPI-ANALYTICS] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}
