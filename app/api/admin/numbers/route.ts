import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, logAdminAction, getIpAddress } from "@/lib/admin-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

export async function GET(req: NextRequest) {
  try {
    // Require admin access
    const adminUser = await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const numberId = searchParams.get("id")
    const status = searchParams.get("status")
    const userId = searchParams.get("user_id")
    const lowBalanceRisk = searchParams.get("low_balance_risk") === "true"

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // If specific number ID requested, return detailed info
      if (numberId) {
        const numberResult = await client.query(
          `SELECT pn.*, u.email as user_email, 
                  COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, u.email) as user_name
           FROM phone_numbers pn
           INNER JOIN users u ON pn.user_id = u.id
           WHERE pn.id = $1`,
          [numberId]
        )

        if (numberResult.rows.length === 0) {
          return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
        }

        const number = numberResult.rows[0]

        // Get billing history (payments related to this number)
        // Note: This is simplified - in production you might have a better link
        const billingResult = await client.query(
          `SELECT p.id, p.created_at, p.amount_cents, p.status, p.gateway, p.gateway_payment_id
           FROM payments p
           WHERE p.user_id = $1
           ORDER BY p.created_at DESC
           LIMIT 50`,
          [number.user_id]
        )

        // Get call logs for this number
        const callLogsResult = await client.query(
          `SELECT id, call_id, to_number, from_number, duration_seconds, 
                  status, created_at, cost_cents
           FROM call_logs 
           WHERE phone_number_id = $1 OR from_number = $2 OR to_number = $2
           ORDER BY created_at DESC
           LIMIT 50`,
          [numberId, number.phone_number]
        )

        // Get linked pathway
        let pathway = null
        if (number.pathway_id) {
          const pathwayResult = await client.query(
            `SELECT id, name, description, created_at, updated_at
             FROM pathways WHERE id = $1`,
            [number.pathway_id]
          )
          if (pathwayResult.rows.length > 0) {
            pathway = pathwayResult.rows[0]
          }
        }

        return NextResponse.json({
          success: true,
          number: {
            id: number.id,
            phoneNumber: number.phone_number,
            userId: number.user_id,
            userEmail: number.user_email,
            userName: number.user_name,
            location: number.location,
            type: number.type,
            status: number.status,
            purchasedAt: number.purchased_at,
            monthlyFee: number.monthly_fee ? parseFloat(number.monthly_fee) : null,
            pathwayId: number.pathway_id,
            assignedTo: number.assigned_to
          },
          billingHistory: billingResult.rows.map(row => ({
            id: row.id,
            createdAt: row.created_at,
            amountCents: parseInt(row.amount_cents),
            status: row.status,
            gateway: row.gateway,
            gatewayPaymentId: row.gateway_payment_id
          })),
          callLogs: callLogsResult.rows.map(row => ({
            id: row.id,
            callId: row.call_id,
            toNumber: row.to_number,
            fromNumber: row.from_number,
            durationSeconds: row.duration_seconds,
            status: row.status,
            createdAt: row.created_at,
            costCents: row.cost_cents ? parseInt(row.cost_cents) : null
          })),
          pathway
        })
      }

      // List phone numbers with filters
      let query = `
        SELECT pn.*, u.email as user_email, 
               COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, u.email) as user_name,
               w.balance_cents as wallet_balance
        FROM phone_numbers pn
        INNER JOIN users u ON pn.user_id = u.id
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE 1=1
      `
      const values: any[] = []
      let paramCount = 0

      if (status) {
        paramCount++
        query += ` AND (pn.status = $${paramCount} OR pn.status = $${paramCount + 1})`
        values.push(status, status.charAt(0).toUpperCase() + status.slice(1))
      }

      if (userId) {
        paramCount += 2
        query += ` AND pn.user_id = $${paramCount}`
        values.push(userId)
      }

      if (lowBalanceRisk) {
        paramCount++
        query += ` AND (w.balance_cents IS NULL OR w.balance_cents < 0)`
      }

      query += ` ORDER BY pn.purchased_at DESC LIMIT 100`

      const numbersResult = await client.query(query, values)

      return NextResponse.json({
        success: true,
        numbers: numbersResult.rows.map(row => ({
          id: row.id,
          phoneNumber: row.phone_number,
          userId: row.user_id,
          userEmail: row.user_email,
          userName: row.user_name,
          location: row.location,
          type: row.type,
          status: row.status,
          purchasedAt: row.purchased_at,
          monthlyFee: row.monthly_fee ? parseFloat(row.monthly_fee) : null,
          pathwayId: row.pathway_id,
          walletBalance: row.wallet_balance ? parseInt(row.wallet_balance) : null
        }))
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-NUMBERS] Error:", error)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require admin access
    const adminUser = await requireAdmin(req)

    const body = await req.json()
    const { numberId, action } = body

    if (!numberId || !action) {
      return NextResponse.json({ error: "numberId and action are required" }, { status: 400 })
    }

    if (!["block", "unblock", "unsubscribe"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // Get current number state
      const numberResult = await client.query(
        `SELECT * FROM phone_numbers WHERE id = $1`,
        [numberId]
      )

      if (numberResult.rows.length === 0) {
        return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
      }

      const oldValue = numberResult.rows[0]
      let newStatus = oldValue.status

      if (action === "block") {
        newStatus = "blocked"
      } else if (action === "unblock") {
        newStatus = "active"
      } else if (action === "unsubscribe") {
        newStatus = "unsubscribed"
        // In production, you would also cancel the Stripe subscription here
      }

      // Update number status
      await client.query(
        `UPDATE phone_numbers SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, numberId]
      )

      // Log admin action
      await logAdminAction({
        adminUserId: adminUser.id,
        action: `${action}_number`,
        resourceType: "phone_number",
        resourceId: numberId,
        oldValue: { status: oldValue.status },
        newValue: { status: newStatus },
        metadata: { phoneNumber: oldValue.phone_number },
        ipAddress: getIpAddress(req)
      })

      return NextResponse.json({
        success: true,
        message: `Number ${action}ed successfully`
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-NUMBERS] Error:", error)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
