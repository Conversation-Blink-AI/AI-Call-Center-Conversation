import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

// Helper to derive payment type from gateway payment ID and context
// Since we don't store payment type in the payments table, we'll infer it
// from Stripe session metadata or webhook data if available
function derivePaymentType(payment: any): string {
  // Check if we can determine from gateway_payment_id pattern
  // For now, we'll return "Unknown" and let the frontend handle display
  // In a real implementation, you might query Stripe API or have a metadata field
  return "Unknown" // Will be enhanced with Stripe API lookup if needed
}

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
    const status = searchParams.get("status")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const gateway = searchParams.get("gateway")

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
        conditions.push(`p.user_id = $${paramCount}`)
        values.push(userId)
      }

      if (status) {
        paramCount++
        conditions.push(`p.status = $${paramCount}`)
        values.push(status)
      }

      if (gateway) {
        paramCount++
        conditions.push(`p.gateway = $${paramCount}`)
        values.push(gateway)
      }

      if (startDate) {
        paramCount++
        conditions.push(`p.created_at >= $${paramCount}`)
        values.push(startDate)
      }

      if (endDate) {
        paramCount++
        conditions.push(`p.created_at <= $${paramCount}`)
        values.push(endDate)
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(" AND ")}`
        : ""

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payments p
        ${whereClause}
      `
      const countResult = await client.query(countQuery, values)
      const total = parseInt(countResult.rows[0].total)

      // Get payments with user info
      paramCount++
      const paymentsQuery = `
        SELECT 
          p.id,
          p.created_at,
          p.amount_cents,
          p.status,
          p.gateway,
          p.gateway_payment_id,
          u.id as user_id,
          u.email as user_email,
          COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, u.email) as user_name
        FROM payments p
        INNER JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `
      values.push(limit, offset)
      const paymentsResult = await client.query(paymentsQuery, values)

      // Try to get phone number info for payments (if it's a phone number purchase)
      // This is a simplified approach - in production you might query Stripe API
      const payments = paymentsResult.rows.map(row => ({
        id: row.id,
        createdAt: row.created_at,
        user: {
          id: row.user_id,
          email: row.user_email,
          name: row.user_name
        },
        type: derivePaymentType(row), // Will be "Unknown" for now
        amountCents: parseInt(row.amount_cents),
        currency: "USD", // Default, could be stored in payments table
        status: row.status,
        stripeRef: row.gateway === "stripe" ? row.gateway_payment_id : null,
        phoneNumber: null // Would need to query Stripe or store in metadata
      }))

      return NextResponse.json({
        success: true,
        payments,
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
    console.error("❌ [ADMIN-PAYMENTS] Error:", error)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
