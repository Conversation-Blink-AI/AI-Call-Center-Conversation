import * as jwt from "jsonwebtoken"
import type { JwtPayload } from "jsonwebtoken"
import type { ForexOrgMembership, ForexPermission } from "@/lib/forex-permissions"
import { extractForexAuthFields, type ForexAuthFields } from "@/lib/forex-permissions"

export const HUSTLE_JWT_ALGORITHMS = ["HS256", "HS384", "HS512"] as const

export interface HustleTokenPayload extends JwtPayload {
  id?: string
  _id?: string
  email?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  phoneNumber?: string
  phone_number?: string
  role?: string
  verified?: boolean
  platforms?: unknown[]
  company?: string
  platform?: string
  permissions?: ForexPermission[]
  orgMemberships?: ForexOrgMembership[]
  activeOrgId?: string | null
  activeRole?: string | null
}

export type DecodeHustleTokenResult =
  | { ok: true; decoded: HustleTokenPayload & Record<string, unknown> }
  | { ok: false; status: number; message: string }

export function decodeHustleToken(token: string): DecodeHustleTokenResult {
  const hustleJwtSecret = process.env.HUSTLE_JWT_SECRET

  if (hustleJwtSecret) {
    try {
      const decoded = jwt.verify(token, hustleJwtSecret, {
        algorithms: [...HUSTLE_JWT_ALGORITHMS],
      }) as HustleTokenPayload & Record<string, unknown>

      return { ok: true, decoded }
    } catch (verifyError: unknown) {
      const err = verifyError as { name?: string; message?: string }

      if (err.name === "TokenExpiredError") {
        return { ok: false, status: 401, message: "Token has expired" }
      }

      if (err.name === "JsonWebTokenError") {
        return { ok: false, status: 401, message: "Invalid token signature" }
      }

      return { ok: false, status: 401, message: err.message || "Invalid token" }
    }
  }

  const decoded = jwt.decode(token) as (HustleTokenPayload & Record<string, unknown>) | null

  if (!decoded) {
    return { ok: false, status: 401, message: "Invalid token format" }
  }

  if (decoded.exp && Date.now() >= decoded.exp * 1000) {
    return { ok: false, status: 401, message: "Token has expired" }
  }

  return { ok: true, decoded }
}

export function buildHustleAuthContext(
  decoded: Record<string, unknown>,
  fallbackRole: string = "client",
): ForexAuthFields {
  const role = typeof decoded.role === "string" ? decoded.role : fallbackRole
  return extractForexAuthFields(decoded, role)
}
