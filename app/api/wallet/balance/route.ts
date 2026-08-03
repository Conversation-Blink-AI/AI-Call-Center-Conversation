import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import {
  getWorkspaceOrgIdFromCookies,
  resolveDashboardResourceOwner,
} from '@/lib/workspace-context'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const workspaceOrgId = await getWorkspaceOrgIdFromCookies()
    const owner = await resolveDashboardResourceOwner(user, workspaceOrgId)
    const resourceUserId = owner.userId

    console.log(
      `🔍 [WALLET-BALANCE] Fetching balance for resource user: ${resourceUserId} (auth=${user.id}, mode=${owner.mode})`,
    )

    // Query wallet for this user
    const result = await db.query(
      'SELECT balance_cents FROM wallets WHERE user_id = $1',
      [resourceUserId]
    )

    let balanceCents = 0

    if (result.rows.length > 0) {
      balanceCents = result.rows[0].balance_cents || 0
    } else {
      // Create new wallet with 0 balance if doesn't exist
      await db.query(
        'INSERT INTO wallets (user_id, balance_cents, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        [resourceUserId, 0]
      )
      console.log(`✅ [WALLET-BALANCE] Created new wallet for user: ${resourceUserId}`)
    }

    console.log(`✅ [WALLET-BALANCE] Balance for user ${resourceUserId}: ${balanceCents} cents`)

    return NextResponse.json({
      balance_cents: balanceCents,
      balance_dollars: (balanceCents / 100).toFixed(2),
      workspace_mode: owner.mode,
      resource_user_id: resourceUserId,
    })

  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    )
  }
}
