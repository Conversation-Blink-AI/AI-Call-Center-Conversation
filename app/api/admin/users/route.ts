import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

export async function GET(req: NextRequest) {
  try {
    // Require admin access
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("id")
    const search = searchParams.get("search") // Search by email, id, phone number, team name

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // If specific user ID requested, return detailed user info
      if (userId) {
        console.log("🔍 [ADMIN-USERS] Fetching user details for ID:", userId)
        
        // Get user profile
        let userResult
        try {
          userResult = await client.query(
            `SELECT id, email, first_name, last_name, company, role, phone_number, 
                    created_at, updated_at, last_login, is_admin, external_token
             FROM users WHERE id = $1`,
            [userId]
          )
        } catch (err: any) {
          console.error("❌ [ADMIN-USERS] Error querying user:", err.message)
          return NextResponse.json({ 
            error: `Database error: ${err.message}` 
          }, { status: 500 })
        }

        if (userResult.rows.length === 0) {
          console.log("❌ [ADMIN-USERS] User not found for ID:", userId)
          return NextResponse.json({ 
            error: `User not found with ID: ${userId}` 
          }, { status: 404 })
        }
        
        console.log("✅ [ADMIN-USERS] User found:", userResult.rows[0].email)

        const user = userResult.rows[0]

        // Helper to safely execute queries
        const safeQuery = async (query: string, params: any[], fallback: any = { rows: [] }, queryName: string) => {
          try {
            return await client.query(query, params)
          } catch (err: any) {
            console.error(`❌ [ADMIN-USERS] Query failed (${queryName}):`, err.message)
            return fallback
          }
        }

        // Get numbers owned
        const numbersResult = await safeQuery(
          `SELECT id, phone_number, location, type, status, 
                  purchased_at, monthly_fee, pathway_id
           FROM phone_numbers WHERE user_id = $1
           ORDER BY purchased_at DESC`,
          [userId],
          { rows: [] },
          'numbers'
        )

        // Get wallet + balance
        const walletResult = await safeQuery(
          `SELECT id, balance_cents, updated_at
           FROM wallets WHERE user_id = $1`,
          [userId],
          { rows: [] },
          'wallet'
        )

        // Get payments list
        const paymentsResult = await safeQuery(
          `SELECT id, created_at, amount_cents, status, gateway, gateway_payment_id
           FROM payments WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 50`,
          [userId],
          { rows: [] },
          'payments'
        )

        // Get recent call logs - try call_logs first, fallback to calls
        let callLogsResult
        try {
          callLogsResult = await client.query(
            `SELECT id, call_id, to_number, from_number, duration_seconds, 
                    status, created_at, cost_cents
             FROM call_logs WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId]
          )
        } catch {
          try {
            callLogsResult = await client.query(
              `SELECT id, call_id, to_number, from_number, duration_seconds, 
                      status, created_at, cost_cents
               FROM calls WHERE user_id = $1
               ORDER BY created_at DESC
               LIMIT 50`,
              [userId]
            )
          } catch {
            callLogsResult = { rows: [] }
          }
        }

        // Get pathways created/updated
        const pathwaysResult = await safeQuery(
          `SELECT id, name, description, created_at, updated_at, 
                  creator_id, updater_id
           FROM pathways 
           WHERE creator_id = $1 OR updater_id = $1
           ORDER BY updated_at DESC
           LIMIT 50`,
          [userId],
          { rows: [] },
          'pathways'
        )

        // Get teams user belongs to
        const teamsResult = await safeQuery(
          `SELECT t.id, t.name, t.description, tm.role as member_role
           FROM teams t
           INNER JOIN team_members tm ON t.id = tm.team_id
           WHERE tm.user_id = $1`,
          [userId],
          { rows: [] },
          'teams'
        )

        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.first_name && user.last_name 
              ? `${user.first_name} ${user.last_name}`.trim()
              : user.first_name || user.last_name || user.email,
            company: user.company,
            role: user.role,
            phoneNumber: user.phone_number,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            lastLogin: user.last_login,
            isAdmin: user.is_admin || false,
            hustleToken: user.external_token || null,
            hasHustleToken: Boolean(user.external_token)
          },
          numbers: numbersResult.rows.map(row => ({
            id: row.id,
            phoneNumber: row.phone_number,
            location: row.location,
            type: row.type,
            status: row.status,
            purchasedAt: row.purchased_at,
            monthlyFee: row.monthly_fee ? parseFloat(row.monthly_fee) : null,
            pathwayId: row.pathway_id
          })),
          wallet: walletResult.rows.length > 0 ? {
            id: walletResult.rows[0].id,
            balanceCents: parseInt(walletResult.rows[0].balance_cents),
            updatedAt: walletResult.rows[0].updated_at
          } : null,
          payments: paymentsResult.rows.map(row => ({
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
          pathways: pathwaysResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            creatorId: row.creator_id,
            updaterId: row.updater_id
          })),
          teams: teamsResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            memberRole: row.member_role
          }))
        })
      }

      // List users with search
      let query = `
        SELECT DISTINCT u.id, u.email, 
               COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, u.email) as name,
               u.company, u.role, 
               u.created_at, u.last_login, u.is_admin
        FROM users u
        LEFT JOIN phone_numbers pn ON u.id = pn.user_id
        LEFT JOIN team_members tm ON u.id = tm.user_id
        LEFT JOIN teams t ON tm.team_id = t.id
        WHERE 1=1
      `
      const values: any[] = []
      let paramCount = 0

      if (search) {
        paramCount++
        query += ` AND (
          u.email ILIKE $${paramCount} OR
          u.id::text = $${paramCount} OR
          u.first_name ILIKE $${paramCount} OR
          u.last_name ILIKE $${paramCount} OR
          (u.first_name || ' ' || u.last_name) ILIKE $${paramCount} OR
          pn.phone_number ILIKE $${paramCount} OR
          t.name ILIKE $${paramCount}
        )`
        values.push(`%${search}%`)
      }

      query += ` ORDER BY u.created_at DESC LIMIT 100`

      const usersResult = await client.query(query, values)

      return NextResponse.json({
        success: true,
        users: usersResult.rows.map(row => ({
          id: row.id,
          email: row.email,
          name: row.name || row.email,
          company: row.company,
          role: row.role,
          createdAt: row.created_at,
          lastLogin: row.last_login,
          isAdmin: row.is_admin || false
        }))
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-USERS] Error:", error)
    console.error("❌ [ADMIN-USERS] Error stack:", error.stack)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 })
  }
}
