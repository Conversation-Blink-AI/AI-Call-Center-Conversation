import crypto from "crypto"
import type { NextRequest } from "next/server"

const TIMESTAMP_MAX_SKEW_SECONDS = 5 * 60

export type HustleAuthResult =
  | { ok: true; requestId: string | null }
  | { ok: false; status: number; error: string }

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return null
  return authorization.slice("Bearer ".length).trim() || null
}

function verifyBearerToken(request: NextRequest): HustleAuthResult | null {
  const configuredToken = process.env.SUBSCRIPTION_INTERNAL_API_TOKEN
  if (!configuredToken) return null

  const bearerToken = getBearerToken(request)
  if (!bearerToken || bearerToken !== configuredToken) {
    return { ok: false, status: 401, error: "Unauthorized integration request" }
  }

  return null
}

function verifyHmacSignature(
  request: NextRequest,
  rawBody: string,
): HustleAuthResult | null {
  const hmacSecret = process.env.SUBSCRIPTION_INTERNAL_HMAC_SECRET
  if (!hmacSecret) return null

  const timestamp = request.headers.get("x-hustle-timestamp")
  const signatureHeader = request.headers.get("x-hustle-signature")

  if (!timestamp || !signatureHeader) {
    return { ok: false, status: 401, error: "Missing Hustle signature headers" }
  }

  const timestampSeconds = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, status: 401, error: "Invalid X-Hustle-Timestamp" }
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestampSeconds) > TIMESTAMP_MAX_SKEW_SECONDS) {
    return { ok: false, status: 401, error: "Request timestamp is outside allowed window" }
  }

  const expected = crypto
    .createHmac("sha256", hmacSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")

  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader

  if (!timingSafeEqual(expected, provided)) {
    return { ok: false, status: 401, error: "Invalid Hustle signature" }
  }

  return null
}

/**
 * Verifies Hustle integration requests.
 *
 * Env:
 * - SUBSCRIPTION_INTERNAL_API_TOKEN (required in production)
 * - SUBSCRIPTION_INTERNAL_HMAC_SECRET (optional; when set, HMAC is enforced)
 */
export function verifyHustleIntegrationRequest(
  request: NextRequest,
  rawBody: string,
): HustleAuthResult {
  const requestId = request.headers.get("x-hustle-request-id")

  const bearerFailure = verifyBearerToken(request)
  if (bearerFailure) return bearerFailure

  const hmacFailure = verifyHmacSignature(request, rawBody)
  if (hmacFailure) return hmacFailure

  const configuredToken = process.env.SUBSCRIPTION_INTERNAL_API_TOKEN
  const hmacSecret = process.env.SUBSCRIPTION_INTERNAL_HMAC_SECRET

  if (!configuredToken && !hmacSecret) {
    console.warn("[HUSTLE-INTEGRATION] No SUBSCRIPTION_INTERNAL_API_TOKEN or HMAC secret configured")
  }

  return { ok: true, requestId }
}
