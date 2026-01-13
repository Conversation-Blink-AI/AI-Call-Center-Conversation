import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

// Helper to safely execute a query with fallback
async function safeQuery(client: Client, query: string, fallback: any = { rows: [{ count: 0, total: 0, total_calls: 0, completed_calls: 0, failed_calls: 0, total_duration: 0, total_cost: 0 }] }, queryName?: string) {
  try {
    return await client.query(query)
  } catch (error: any) {
    console.error(`❌ [ADMIN-OVERVIEW] Query failed${queryName ? ` (${queryName})` : ''}:`, error.message)
    console.error(`❌ [ADMIN-OVERVIEW] Query:`, query.substring(0, 200))
    return fallback
  }
}

export async function GET(req: NextRequest) {
  try {
    // Require admin access
    await requireAdmin(req)

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // Get KPIs - handle potential missing tables/columns gracefully
      const [
        totalUsersResult,
        activeNumbersResult,
        blockedNumbersResult,
        walletNegativeResult,
        revenueTodayResult,
        revenue7dResult,
        revenue30dResult
      ] = await Promise.all([
        // Total users
        safeQuery(client, 'SELECT COUNT(*) as count FROM users'),
        
        // Active numbers
        safeQuery(client, `
          SELECT COUNT(*) as count 
          FROM phone_numbers 
          WHERE status = 'active' OR status = 'Active'
        `),
        
        // Blocked numbers
        safeQuery(client, `
          SELECT COUNT(*) as count 
          FROM phone_numbers 
          WHERE status = 'blocked' OR status = 'Blocked'
        `),
        
        // Wallet negative count
        safeQuery(client, `
          SELECT COUNT(*) as count 
          FROM wallets 
          WHERE balance_cents < 0
        `),
        
        // Revenue today
        safeQuery(client, `
          SELECT COALESCE(SUM(amount_cents), 0) as total 
          FROM payments 
          WHERE status = 'succeeded' 
          AND created_at >= CURRENT_DATE
        `),
        
        // Revenue 7d
        safeQuery(client, `
          SELECT COALESCE(SUM(amount_cents), 0) as total 
          FROM payments 
          WHERE status = 'succeeded' 
          AND created_at >= NOW() - INTERVAL '7 days'
        `),
        
        // Revenue 30d
        safeQuery(client, `
          SELECT COALESCE(SUM(amount_cents), 0) as total 
          FROM payments 
          WHERE status = 'succeeded' 
          AND created_at >= NOW() - INTERVAL '30 days'
        `)
      ])

      // Active users (7d) - try call_logs first, fallback to calls
      let activeUsers7dResult
      try {
        activeUsers7dResult = await client.query(`
          SELECT COUNT(DISTINCT user_id) as count 
          FROM call_logs 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `)
      } catch (err: any) {
        console.error("❌ [ADMIN-OVERVIEW] activeUsers7d (call_logs) failed:", err.message)
        try {
          activeUsers7dResult = await client.query(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM calls 
            WHERE created_at >= NOW() - INTERVAL '7 days'
          `)
        } catch (err2: any) {
          console.error("❌ [ADMIN-OVERVIEW] activeUsers7d (calls) also failed:", err2.message)
          activeUsers7dResult = { rows: [{ count: 0 }] }
        }
      }

      // Call stats - try call_logs first, fallback to calls
      let callStatsResult
      try {
        callStatsResult = await client.query(`
          SELECT 
            COUNT(*) as total_calls,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
            COUNT(CASE WHEN status = 'failed' OR status = 'error' THEN 1 END) as failed_calls,
            COALESCE(SUM(duration_seconds), 0) as total_duration,
            COALESCE(SUM(
              CASE 
                WHEN cost_cents IS NOT NULL THEN cost_cents
                ELSE 0
              END
            ), 0) as total_cost
          FROM call_logs
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `)
      } catch (err: any) {
        console.error("❌ [ADMIN-OVERVIEW] callStats (call_logs) failed:", err.message)
        try {
          callStatsResult = await client.query(`
            SELECT 
              COUNT(*) as total_calls,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
              COUNT(CASE WHEN status = 'failed' OR status = 'error' THEN 1 END) as failed_calls,
              COALESCE(SUM(duration_seconds), 0) as total_duration,
              COALESCE(SUM(
                CASE 
                  WHEN cost_cents IS NOT NULL THEN cost_cents
                  ELSE 0
                END
              ), 0) as total_cost
            FROM calls
            WHERE created_at >= NOW() - INTERVAL '7 days'
          `)
        } catch (err2: any) {
          console.error("❌ [ADMIN-OVERVIEW] callStats (calls) also failed:", err2.message)
          callStatsResult = { rows: [{ total_calls: 0, completed_calls: 0, failed_calls: 0, total_duration: 0, total_cost: 0 }] }
        }
      }

      // Get users with blocked numbers
      const blockedNumbersUsersResult = await safeQuery(client, `
        SELECT DISTINCT u.id, u.email, 
               CASE 
                 WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN u.first_name || ' ' || u.last_name
                 WHEN u.first_name IS NOT NULL THEN u.first_name
                 WHEN u.last_name IS NOT NULL THEN u.last_name
                 ELSE u.email
               END as name,
               COUNT(pn.id) as blocked_count
        FROM users u
        INNER JOIN phone_numbers pn ON u.id = pn.user_id
        WHERE pn.status = 'blocked' OR pn.status = 'Blocked'
        GROUP BY u.id, u.email, u.first_name, u.last_name
        ORDER BY blocked_count DESC
        LIMIT 20
      `, { rows: [] }, 'blockedNumbersUsers')

      // Get recent payments (last 50)
      const recentPaymentsResult = await safeQuery(client, `
        SELECT 
          p.id,
          p.created_at,
          p.amount_cents,
          p.status,
          p.gateway,
          p.gateway_payment_id,
          u.id as user_id,
          u.email as user_email,
          CASE 
            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN u.first_name || ' ' || u.last_name
            WHEN u.first_name IS NOT NULL THEN u.first_name
            WHEN u.last_name IS NOT NULL THEN u.last_name
            ELSE u.email
          END as user_name
        FROM payments p
        INNER JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `, { rows: [] }, 'recentPayments')

      // Get top users by usage/spend (last 30 days)
      let topUsersResult
      try {
        topUsersResult = await client.query(`
          SELECT 
            u.id,
            u.email,
            CASE 
              WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN u.first_name || ' ' || u.last_name
              WHEN u.first_name IS NOT NULL THEN u.first_name
              WHEN u.last_name IS NOT NULL THEN u.last_name
              ELSE u.email
            END as name,
            COUNT(cl.id) as call_count,
            COALESCE(SUM(
              CASE 
                WHEN cl.cost_cents IS NOT NULL THEN cl.cost_cents
                ELSE 0
              END
            ), 0) as total_spend_cents
          FROM users u
          LEFT JOIN call_logs cl ON u.id = cl.user_id 
            AND cl.created_at >= NOW() - INTERVAL '30 days'
          GROUP BY u.id, u.email, u.first_name, u.last_name
          HAVING COUNT(cl.id) > 0
          ORDER BY call_count DESC, total_spend_cents DESC
          LIMIT 20
        `)
      } catch (err: any) {
        console.error("❌ [ADMIN-OVERVIEW] topUsers query (call_logs) failed:", err.message)
        // Fallback to calls table if call_logs doesn't exist
        try {
        topUsersResult = await client.query(`
          SELECT 
            u.id,
            u.email,
            CASE 
              WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN u.first_name || ' ' || u.last_name
              WHEN u.first_name IS NOT NULL THEN u.first_name
              WHEN u.last_name IS NOT NULL THEN u.last_name
              ELSE u.email
            END as name,
            COUNT(c.id) as call_count,
            COALESCE(SUM(
              CASE 
                WHEN c.cost_cents IS NOT NULL THEN c.cost_cents
                ELSE 0
              END
            ), 0) as total_spend_cents
          FROM users u
          LEFT JOIN calls c ON u.id = c.user_id 
            AND c.created_at >= NOW() - INTERVAL '30 days'
          GROUP BY u.id, u.email, u.first_name, u.last_name
          HAVING COUNT(c.id) > 0
          ORDER BY call_count DESC, total_spend_cents DESC
          LIMIT 20
        `)
        } catch (err2: any) {
          console.error("❌ [ADMIN-OVERVIEW] topUsers query (calls) also failed:", err2.message)
          topUsersResult = { rows: [] }
        }
      }

      const kpis = {
        totalUsers: parseInt(totalUsersResult.rows[0]?.count || 0),
        activeUsers7d: parseInt(activeUsers7dResult.rows[0]?.count || 0),
        activeNumbers: parseInt(activeNumbersResult.rows[0]?.count || 0),
        blockedNumbers: parseInt(blockedNumbersResult.rows[0]?.count || 0),
        walletNegativeCount: parseInt(walletNegativeResult.rows[0]?.count || 0),
        revenue: {
          today: parseInt(revenueTodayResult.rows[0]?.total || 0),
          last7d: parseInt(revenue7dResult.rows[0]?.total || 0),
          last30d: parseInt(revenue30dResult.rows[0]?.total || 0)
        },
        calls: {
          total: parseInt(callStatsResult.rows[0]?.total_calls || 0),
          completed: parseInt(callStatsResult.rows[0]?.completed_calls || 0),
          failed: parseInt(callStatsResult.rows[0]?.failed_calls || 0),
          totalDuration: parseInt(callStatsResult.rows[0]?.total_duration || 0),
          totalCost: parseInt(callStatsResult.rows[0]?.total_cost || 0)
        }
      }

      const tables = {
        usersWithBlockedNumbers: (blockedNumbersUsersResult.rows || []).map(row => ({
          userId: row.id,
          email: row.email,
          name: row.name,
          blockedCount: parseInt(row.blocked_count || 0)
        })),
        recentPayments: (recentPaymentsResult.rows || []).map(row => ({
          id: row.id,
          createdAt: row.created_at,
          amountCents: parseInt(row.amount_cents || 0),
          status: row.status,
          gateway: row.gateway,
          gatewayPaymentId: row.gateway_payment_id,
          user: {
            id: row.user_id,
            email: row.user_email,
            name: row.user_name
          }
        })),
        topUsers: (topUsersResult.rows || []).map(row => ({
          userId: row.id,
          email: row.email,
          name: row.name,
          callCount: parseInt(row.call_count || 0),
          totalSpendCents: parseInt(row.total_spend_cents || 0)
        }))
      }

      return NextResponse.json({
        success: true,
        kpis,
        tables
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-OVERVIEW] Error:", error)
    console.error("❌ [ADMIN-OVERVIEW] Error stack:", error.stack)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 })
  }
}
