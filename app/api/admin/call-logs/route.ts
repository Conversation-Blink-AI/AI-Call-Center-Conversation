import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

export async function GET(req: NextRequest) {
  try {
    // Require admin access
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    // Filters
    const userId = searchParams.get("user_id")
    const phoneNumberId = searchParams.get("phone_number_id")
    const status = searchParams.get("status")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const minDuration = searchParams.get("min_duration")
    const maxDuration = searchParams.get("max_duration")
    const minCost = searchParams.get("min_cost")
    const maxCost = searchParams.get("max_cost")

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // Build WHERE clause
      const conditions: string[] = []
      const values: any[] = []
      let paramCount = 0

      if (userId) {
        paramCount++
        conditions.push(`cl.user_id = $${paramCount}`)
        values.push(userId)
      }

      if (phoneNumberId) {
        paramCount++
        conditions.push(`cl.phone_number_id = $${paramCount}`)
        values.push(phoneNumberId)
      }

      if (status) {
        paramCount++
        conditions.push(`cl.status = $${paramCount}`)
        values.push(status)
      }

      if (startDate) {
        paramCount++
        conditions.push(`cl.created_at >= $${paramCount}`)
        values.push(startDate)
      }

      if (endDate) {
        paramCount++
        conditions.push(`cl.created_at <= $${paramCount}`)
        values.push(endDate)
      }

      if (minDuration) {
        paramCount++
        conditions.push(`cl.duration_seconds >= $${paramCount}`)
        values.push(parseInt(minDuration))
      }

      if (maxDuration) {
        paramCount++
        conditions.push(`cl.duration_seconds <= $${paramCount}`)
        values.push(parseInt(maxDuration))
      }

      if (minCost) {
        paramCount++
        conditions.push(`cl.cost_cents >= $${paramCount}`)
        values.push(parseInt(minCost))
      }

      if (maxCost) {
        paramCount++
        conditions.push(`cl.cost_cents <= $${paramCount}`)
        values.push(parseInt(maxCost))
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(" AND ")}`
        : ""

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM call_logs cl
        ${whereClause}
      `
      const countResult = await client.query(countQuery, values)
      const total = parseInt(countResult.rows[0].total)

      // Get call logs with user and phone number info
      paramCount++
      const callLogsQuery = `
        SELECT 
          cl.id,
          cl.call_id,
          cl.user_id,
          cl.to_number,
          cl.from_number,
          cl.duration_seconds,
          cl.status,
          cl.cost_cents,
          cl.created_at,
          cl.ended_reason,
          cl.pathway_id,
          u.email as user_email,
          COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, u.email) as user_name,
          pn.phone_number as phone_number_detail
        FROM call_logs cl
        INNER JOIN users u ON cl.user_id = u.id
        LEFT JOIN phone_numbers pn ON cl.phone_number_id = pn.id
        ${whereClause}
        ORDER BY cl.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `
      values.push(limit, offset)
      const callLogsResult = await client.query(callLogsQuery, values)

      return NextResponse.json({
        success: true,
        callLogs: callLogsResult.rows.map(row => ({
          id: row.id,
          callId: row.call_id,
          userId: row.user_id,
          userEmail: row.user_email,
          userName: row.user_name,
          toNumber: row.to_number,
          fromNumber: row.from_number,
          durationSeconds: row.duration_seconds,
          status: row.status,
          costCents: row.cost_cents ? parseInt(row.cost_cents) : null,
          createdAt: row.created_at,
          endedReason: row.ended_reason,
          pathwayId: row.pathway_id,
          phoneNumberDetail: row.phone_number_detail
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-CALL-LOGS] Error:", error)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
