import { NextRequest } from "next/server"
import { canViewWallet } from "@/lib/call-center-permissions"
import { getPool } from "@/lib/db-client"
import { ensureForexOrgTables } from "@/lib/forex-org-sync"
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/lib/public-api-cors"
import {
  resolveOrgAdminUserId,
  verifyOrgMembership,
  verifyPublicApiUser,
} from "@/lib/public-api-verify"

export async function OPTIONS(_request: NextRequest) {
  return publicApiOptionsResponse()
}

async function loadWalletBalance(
  pool: ReturnType<typeof getPool>,
  userId: string,
): Promise<{ balanceCents: number; walletCount: number }> {
  const walletResult = await pool.query(
    `SELECT
       COALESCE(balance_cents, 0)::bigint AS balance_cents,
       1::int AS wallet_count
     FROM wallets
     WHERE user_id = $1::uuid
     LIMIT 1`,
    [userId],
  )

  if (walletResult.rows.length === 0) {
    return { balanceCents: 0, walletCount: 0 }
  }

  return {
    balanceCents: Number(walletResult.rows[0].balance_cents ?? 0),
    walletCount: Number(walletResult.rows[0].wallet_count ?? 1),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")
    const userIdParam = searchParams.get("userId")
    const orgIdParam = searchParams.get("orgId")?.trim() || null

    if (!emailParam || !userIdParam) {
      return publicApiJsonResponse(
        { success: false, message: "email and userId are required" },
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

    // Personal mode: email + userId only → requester's own wallet
    if (!orgIdParam) {
      const { balanceCents, walletCount } = await loadWalletBalance(
        pool,
        userResult.user.id,
      )

      return publicApiJsonResponse({
        success: true,
        orgId: null,
        email: userResult.user.email,
        userId: userResult.user.id,
        balanceCents,
        balanceDollars: (balanceCents / 100).toFixed(2),
        memberWalletCount: walletCount,
        scopedTo: "self",
        walletOwnerUserId: userResult.user.id,
        walletOwnerEmail: userResult.user.email,
      })
    }

    // Org mode: return organization_admin's personal wallet for this org
    const membershipResult = await verifyOrgMembership(pool, orgIdParam, userResult.user)
    if ("error" in membershipResult) {
      return publicApiJsonResponse(
        { success: false, message: membershipResult.error.message },
        membershipResult.error.status,
      )
    }

    if (!canViewWallet(membershipResult.membership)) {
      return publicApiJsonResponse(
        {
          success: false,
          message: "You do not have permission to view the organization wallet",
        },
        403,
      )
    }

    const adminOwner = await resolveOrgAdminUserId(pool, orgIdParam)
    if (!adminOwner) {
      return publicApiJsonResponse(
        {
          success: false,
          message:
            "Organization admin wallet not found. Ensure the org has an owner or organization_admin membership with a linked user.",
        },
        404,
      )
    }

    const { balanceCents, walletCount } = await loadWalletBalance(pool, adminOwner.userId)

    return publicApiJsonResponse({
      success: true,
      orgId: orgIdParam,
      email: userResult.user.email,
      userId: userResult.user.id,
      balanceCents,
      balanceDollars: (balanceCents / 100).toFixed(2),
      memberWalletCount: walletCount,
      scopedTo: "organization_admin",
      walletOwnerUserId: adminOwner.userId,
      walletOwnerEmail: adminOwner.email,
      walletOwnerSource: adminOwner.source,
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
