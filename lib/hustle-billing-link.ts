import type { Pool } from "pg"
import {
  resolveBillingOrgId,
  type HustleBillingCtxPayload,
} from "@/lib/hustle-billing-ctx"
import {
  WORKSPACE_COOKIE_NAME,
  clearWorkspaceOrgIdFromCookies,
  switchToWorkspace,
} from "@/lib/workspace-context"
import { cookies } from "next/headers"

/**
 * Link Hustle Stripe customer id to Call Center user (personal) or org (organization).
 * stripeCustomerId may be null — no-op in that case.
 */
export async function linkHustleStripeCustomer(
  pool: Pool,
  userId: string,
  payload: HustleBillingCtxPayload,
): Promise<void> {
  const stripeCustomerId = payload.stripeCustomerId
  if (!stripeCustomerId) {
    console.log("[HUSTLE-BILLING] No stripeCustomerId in billingCtx (user has no Stripe customer yet)")
    return
  }

  const orgId = resolveBillingOrgId(payload)

  if (orgId) {
    const result = await pool.query(
      `UPDATE forex_organizations
       SET stripe_customer_id = $1, updated_at = NOW()
       WHERE external_org_id = $2
       RETURNING external_org_id`,
      [stripeCustomerId, orgId],
    )

    if (result.rowCount === 0) {
      console.warn(
        "[HUSTLE-BILLING] Org not found for stripeCustomerId link:",
        orgId,
      )
    } else {
      console.log(
        "[HUSTLE-BILLING] Linked stripeCustomerId to org:",
        orgId,
        stripeCustomerId,
      )
    }
    return
  }

  // Personal workspace: free the unique stripe_customer_id if held by another user, then link.
  await pool.query(
    `UPDATE users
     SET stripe_customer_id = NULL, updated_at = NOW()
     WHERE stripe_customer_id = $1 AND id <> $2`,
    [stripeCustomerId, userId],
  )

  await pool.query(
    `UPDATE users
     SET stripe_customer_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [stripeCustomerId, userId],
  )

  console.log(
    "[HUSTLE-BILLING] Linked stripeCustomerId to user:",
    userId,
    stripeCustomerId,
  )
}

/**
 * Apply workspace cookie from billingCtx (org switch / personal exit).
 */
export async function applyHustleBillingWorkspace(
  pool: Pool,
  authUser: { id: string; email?: string | null; external_id?: string | null },
  payload: HustleBillingCtxPayload,
): Promise<void> {
  const orgId = resolveBillingOrgId(payload)

  if (!orgId) {
    await clearWorkspaceOrgIdFromCookies()
    return
  }

  const result = await switchToWorkspace(pool, authUser, orgId)
  if ("error" in result) {
    console.warn(
      "[HUSTLE-BILLING] Workspace switch skipped:",
      result.error.message,
    )
    await clearWorkspaceOrgIdFromCookies()
    return
  }

  const cookieStore = await cookies()
  cookieStore.set(WORKSPACE_COOKIE_NAME, result.summary.orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}
