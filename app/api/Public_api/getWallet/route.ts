import { NextRequest } from "next/server"
import { canViewWallet } from "@/lib/call-center-permissions"
import { getPool } from "@/lib/db-client"
import { ensureForexOrgTables } from "@/lib/forex-org-sync"
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/lib/public-api-cors"
import {
  resolveOrgScopedUserIds,
  resolveScopeFromMembership,
  verifyOrgMembership,
  verifyPublicApiUser,
} from "@/lib/public-api-verify"

export async function OPTIONS(_request: NextRequest) {
  return publicApiOptionsResponse()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")
    const userIdParam = searchParams.get("userId")
    const orgIdParam = searchParams.get("orgId")

    if (!emailParam || !userIdParam || !orgIdParam) {
      return publicApiJsonResponse(
        { success: false, message: "email, userId, and orgId are required" },
        400,
      )
    }

    if (!process.env.DATABASE_URL) {
      return publicApiJsonResponse(
        { success: false, message: "Database configuration error" },
        500,
      )
    }

    const pool = getPool()
    await ensureForexOrgTables(pool)

    const userResult = await verifyPublicApiUser(pool, emailParam, userIdParam)
    if ("error" in userResult) {
      return publicApiJsonResponse(
        { success: false, message: userResult.error.message },
        userResult.error.status,
      )
    }

    const membershipResult = await verifyOrgMembership(pool, orgIdParam, userResult.user)
    if ("error" in membershipResult) {
      return publicApiJsonResponse(
        { success: false, message: membershipResult.error.message },
        membershipResult.error.status,
      )
    }

    if (!canViewWallet(membershipResult.membership)) {
      return publicApiJsonResponse(
        { success: false, message: "You do not have permission to view the organization wallet" },
        403,
      )
    }

    const scope = resolveScopeFromMembership(membershipResult.membership) ?? "organization"
    const scopedUserIds = await resolveOrgScopedUserIds(
      pool,
      orgIdParam,
      membershipResult.membership,
      userResult.user.id,
      scope,
    )

    const walletResult = await pool.query(
      `SELECT
         COALESCE(SUM(w.balance_cents), 0)::bigint AS total_balance_cents,
         COUNT(w.id)::int AS wallet_count
       FROM forex_org_memberships m
       JOIN wallets w ON w.user_id = m.user_id
       WHERE m.external_org_id = $1
         AND m.status = 'active'
         AND m.user_id = ANY($2::uuid[])`,
      [orgIdParam, scopedUserIds],
    )

    const balanceCents = Number(walletResult.rows[0]?.total_balance_cents ?? 0)
    const memberWalletCount = Number(walletResult.rows[0]?.wallet_count ?? 0)

    return publicApiJsonResponse({
      success: true,
      orgId: orgIdParam,
      email: userResult.user.email,
      userId: userResult.user.id,
      balanceCents,
      balanceDollars: (balanceCents / 100).toFixed(2),
      memberWalletCount,
      scopedTo: scope,
    })
  } catch (error: unknown) {
    console.error("[GET-WALLET] Error:", error)
    return publicApiJsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    )
  }
}
