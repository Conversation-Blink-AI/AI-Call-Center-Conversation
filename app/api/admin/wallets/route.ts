import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, logAdminAction, getIpAddress } from "@/lib/admin-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

export async function GET(req: NextRequest) {
  try {
    // Require admin access
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("user_id")
    const search = searchParams.get("search") // Search by email or user ID

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      let targetUserId = userId

      // If search provided, find user by email or ID
      if (search && !userId) {
        const userResult = await client.query(
          `SELECT id FROM users WHERE email = $1 OR id::text = $1`,
          [search]
        )
        if (userResult.rows.length > 0) {
          targetUserId = userResult.rows[0].id
        } else {
          return NextResponse.json({
            success: true,
            wallet: null,
            transactions: [],
            message: "User not found"
          })
        }
      }

      if (!targetUserId) {
        return NextResponse.json({ error: "user_id or search parameter required" }, { status: 400 })
      }

      // Get wallet balance
      const walletResult = await client.query(
        `SELECT id, balance_cents, updated_at
         FROM wallets WHERE user_id = $1`,
        [targetUserId]
      )

      // Get last 50 wallet transactions
      const transactionsResult = await client.query(
        `SELECT wt.id, wt.amount_cents, wt.type, wt.provider_txn_id, 
                wt.metadata, wt.created_at
         FROM wallet_transactions wt
         WHERE wt.wallet_id = (SELECT id FROM wallets WHERE user_id = $1)
         ORDER BY wt.created_at DESC
         LIMIT 50`,
        [targetUserId]
      )

      // Get user info
      const userResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [targetUserId]
      )

      const user = userResult.rows.length > 0 ? userResult.rows[0] : null

      return NextResponse.json({
        success: true,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`.trim()
            : user.first_name || user.last_name || user.email
        } : null,
        wallet: walletResult.rows.length > 0 ? {
          id: walletResult.rows[0].id,
          balanceCents: parseInt(walletResult.rows[0].balance_cents),
          updatedAt: walletResult.rows[0].updated_at
        } : null,
        transactions: transactionsResult.rows.map(row => ({
          id: row.id,
          amountCents: parseInt(row.amount_cents),
          type: row.type,
          providerTxnId: row.provider_txn_id,
          metadata: row.metadata,
          createdAt: row.created_at
        }))
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-WALLETS] Error:", error)
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
    const { userId, action, amountCents, reason } = body

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action are required" }, { status: 400 })
    }

    if (!["adjust", "freeze", "recompute"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (action === "adjust" && amountCents === undefined) {
      return NextResponse.json({ error: "amountCents required for adjust action" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // Get current wallet state
      const walletResult = await client.query(
        `SELECT * FROM wallets WHERE user_id = $1`,
        [userId]
      )

      if (walletResult.rows.length === 0) {
        return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
      }

      const wallet = walletResult.rows[0]
      const oldBalance = parseInt(wallet.balance_cents)

      if (action === "adjust") {
        const newBalance = oldBalance + amountCents

        // Update wallet balance
        await client.query(
          `UPDATE wallets SET balance_cents = $1, updated_at = NOW() WHERE id = $2`,
          [newBalance, wallet.id]
        )

        // Create wallet transaction
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, amount_cents, type, metadata, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            wallet.id,
            amountCents,
            "admin_adjustment",
            JSON.stringify({ reason, adminUserId: adminUser.id })
          ]
        )

        // Log admin action
        await logAdminAction({
          adminUserId: adminUser.id,
          action: "adjust_wallet",
          resourceType: "wallet",
          resourceId: wallet.id,
          oldValue: { balanceCents: oldBalance },
          newValue: { balanceCents: newBalance },
          metadata: { amountCents, reason, userId },
          ipAddress: getIpAddress(req)
        })

        return NextResponse.json({
          success: true,
          message: "Wallet balance adjusted",
          oldBalance,
          newBalance
        })
      } else if (action === "freeze") {
        // For freeze, we'd need a frozen flag in wallets table
        // For now, we'll just log the action
        await logAdminAction({
          adminUserId: adminUser.id,
          action: "freeze_wallet",
          resourceType: "wallet",
          resourceId: wallet.id,
          oldValue: { frozen: false },
          newValue: { frozen: true },
          metadata: { reason, userId },
          ipAddress: getIpAddress(req)
        })

        return NextResponse.json({
          success: true,
          message: "Wallet freeze action logged (frozen flag not yet implemented in schema)"
        })
      } else if (action === "recompute") {
        // Recompute wallet balance from transactions
        const transactionsResult = await client.query(
          `SELECT SUM(amount_cents) as total FROM wallet_transactions WHERE wallet_id = $1`,
          [wallet.id]
        )

        const computedBalance = transactionsResult.rows[0].total 
          ? parseInt(transactionsResult.rows[0].total) 
          : 0

        // Update wallet balance
        await client.query(
          `UPDATE wallets SET balance_cents = $1, updated_at = NOW() WHERE id = $2`,
          [computedBalance, wallet.id]
        )

        // Log admin action
        await logAdminAction({
          adminUserId: adminUser.id,
          action: "recompute_wallet",
          resourceType: "wallet",
          resourceId: wallet.id,
          oldValue: { balanceCents: oldBalance },
          newValue: { balanceCents: computedBalance },
          metadata: { userId },
          ipAddress: getIpAddress(req)
        })

        return NextResponse.json({
          success: true,
          message: "Wallet balance recomputed",
          oldBalance,
          newBalance: computedBalance
        })
      }
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-WALLETS] Error:", error)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
