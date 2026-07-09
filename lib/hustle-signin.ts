import { cookies } from "next/headers"
import * as jwt from "jsonwebtoken"
import { verifyForexAccountToken } from "@/lib/forex-verify"
import { decodeHustleToken } from "@/lib/hustle-token"
import { syncUserFromHustleToken } from "@/lib/hustle-user-sync"
import { assertHustleSignInEnv } from "@/lib/hustle-signin-errors"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export type CompleteHustleSignInResult =
  | {
      ok: true
      user: Record<string, unknown>
      decoded: Record<string, unknown>
      forexAuthFields: Awaited<ReturnType<typeof syncUserFromHustleToken>>["forexAuthFields"]
      token: string
    }
  | { ok: false; status: number; message: string }

export async function completeHustleSignIn(token: string): Promise<CompleteHustleSignInResult> {
  assertHustleSignInEnv()

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
  }
}

export function buildHustleSignInResponse(
  result: Extract<CompleteHustleSignInResult, { ok: true }>,
) {
  const { user, decoded, forexAuthFields, token } = result

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
  }
}
