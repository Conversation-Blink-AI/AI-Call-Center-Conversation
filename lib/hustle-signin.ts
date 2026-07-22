import { cookies } from "next/headers"
import * as jwt from "jsonwebtoken"
import { verifyForexAccountToken } from "@/lib/forex-verify"
import { decodeHustleToken } from "@/lib/hustle-token"
import { syncUserFromHustleToken } from "@/lib/hustle-user-sync"
import { assertHustleSignInEnv } from "@/lib/hustle-signin-errors"
import { verifyAndDecryptHustleBillingCtx } from "@/lib/hustle-billing-ctx"
import {
  applyHustleBillingWorkspace,
  linkHustleStripeCustomer,
} from "@/lib/hustle-billing-link"
import { getPool } from "@/lib/db-client"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export type HustleBillingParams = {
  billingCtx: string
  billingTs: string | number
  billingSig: string
}

export type CompleteHustleSignInResult =
  | {
      ok: true
      user: Record<string, unknown>
      decoded: Record<string, unknown>
      forexAuthFields: Awaited<ReturnType<typeof syncUserFromHustleToken>>["forexAuthFields"]
      token: string
      redirect: string
    }
  | { ok: false; status: number; message: string }

export function sanitizeHustleRedirect(redirect: string | null | undefined): string {
  if (!redirect || typeof redirect !== "string") return "/dashboard"
  const trimmed = redirect.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return "/dashboard"
  }
  return trimmed
}

export async function completeHustleSignIn(
  token: string,
  options?: {
    billing?: HustleBillingParams | null
    redirect?: string | null
  },
): Promise<CompleteHustleSignInResult> {
  assertHustleSignInEnv()

  const redirect = sanitizeHustleRedirect(options?.redirect)

  let billingPayload: Awaited<ReturnType<typeof verifyAndDecryptHustleBillingCtx>> | null =
    null

  if (options?.billing) {
    billingPayload = verifyAndDecryptHustleBillingCtx(options.billing)
    if (!billingPayload.ok) {
      return {
        ok: false,
        status: billingPayload.status,
        message: billingPayload.message,
      }
    }
  }

  const verifyResult = await verifyForexAccountToken(token)
  if (!verifyResult.ok) {
    return { ok: false, status: verifyResult.status, message: verifyResult.message }
  }

  const decodeResult = decodeHustleToken(token)
  if (!decodeResult.ok) {
    return { ok: false, status: decodeResult.status, message: decodeResult.message }
  }

  const decoded = decodeResult.decoded
  const externalId = decoded.id || decoded._id
  const userEmail = decoded.email

  if (!externalId || !userEmail) {
    return { ok: false, status: 400, message: "Invalid user data from token" }
  }

  console.log("[HUSTLE-SIGNIN] Token decoded for user:", userEmail)

  const { user, forexAuthFields } = await syncUserFromHustleToken(token, decoded)

  if (billingPayload?.ok) {
    const pool = getPool()
    try {
      await linkHustleStripeCustomer(pool, String(user.id), billingPayload.payload)
    } catch (linkError) {
      console.error("[HUSTLE-SIGNIN] Failed to link stripeCustomerId:", linkError)
      return {
        ok: false,
        status: 500,
        message: "Failed to link Stripe customer from Hustle billing context",
      }
    }

    try {
      await applyHustleBillingWorkspace(
        pool,
        {
          id: String(user.id),
          email: typeof user.email === "string" ? user.email : null,
          external_id:
            typeof user.external_id === "string" ? user.external_id : String(externalId),
        },
        billingPayload.payload,
      )
    } catch (workspaceError) {
      console.error("[HUSTLE-SIGNIN] Failed to apply billing workspace:", workspaceError)
    }
  }

  const sessionToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  )

  const cookieStore = await cookies()
  cookieStore.set("auth-token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  })

  console.log("[HUSTLE-SIGNIN] Local session cookie set successfully")

  return {
    ok: true,
    user,
    decoded,
    forexAuthFields,
    token,
    redirect,
  }
}

export function buildHustleSignInResponse(
  result: Extract<CompleteHustleSignInResult, { ok: true }>,
) {
  const { user, decoded, forexAuthFields, token, redirect } = result

  return {
    success: true,
    message: "Authentication successful",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName || "User",
      lastName: user.last_name || user.lastName || "",
      company: user.company || "",
      role: user.role || "client",
      phoneNumber: user.phone_number || user.phoneNumber || "",
      verified: user.verified || user.is_verified || false,
      platforms: user.platforms || decoded.platforms || [],
      permissions: forexAuthFields.permissions,
      orgMemberships: forexAuthFields.orgMemberships,
      activeOrgId: forexAuthFields.activeOrgId,
      activeRole: forexAuthFields.activeRole,
    },
    token,
    externalToken: token,
    redirect,
  }
}
