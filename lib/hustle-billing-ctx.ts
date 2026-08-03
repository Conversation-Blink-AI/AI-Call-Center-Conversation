import crypto from "crypto"

const TIMESTAMP_MAX_SKEW_SECONDS = 300
const BILLING_CTX_VERSION = 1
const HKDF_SALT = "hustle-cc-billing-v1"
const HKDF_INFO = "aes-256-gcm"

export type HustleBillingCtxPayload = {
  stripeCustomerId: string | null
  billingOwnerId: string
  workspaceId: string
  workspaceType: string
  orgId: string | null
  iat: number
  exp: number
}

export type VerifyHustleBillingCtxResult =
  | { ok: true; payload: HustleBillingCtxPayload }
  | { ok: false; status: number; message: string }

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function base64urlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const padLength = (4 - (normalized.length % 4)) % 4
  return Buffer.from(normalized + "=".repeat(padLength), "base64")
}

function parsePayload(raw: unknown): HustleBillingCtxPayload | null {
  if (!raw || typeof raw !== "object") return null

  const data = raw as Record<string, unknown>
  const stripeCustomerId =
    data.stripeCustomerId === null
      ? null
      : typeof data.stripeCustomerId === "string"
        ? data.stripeCustomerId
        : null

  if (data.stripeCustomerId !== null && typeof data.stripeCustomerId !== "string") {
    return null
  }

  if (typeof data.billingOwnerId !== "string" || !data.billingOwnerId) return null
  if (typeof data.workspaceId !== "string" || !data.workspaceId) return null
  if (typeof data.workspaceType !== "string" || !data.workspaceType) return null
  if (data.orgId !== null && typeof data.orgId !== "string") return null
  if (typeof data.iat !== "number" || !Number.isFinite(data.iat)) return null
  if (typeof data.exp !== "number" || !Number.isFinite(data.exp)) return null

  return {
    stripeCustomerId,
    billingOwnerId: data.billingOwnerId,
    workspaceId: data.workspaceId,
    workspaceType: data.workspaceType,
    orgId: data.orgId === null ? null : data.orgId,
    iat: data.iat,
    exp: data.exp,
  }
}

/**
 * Verify HMAC + decrypt Hustle SSO billingCtx (server-side only).
 *
 * message = `${billingTs}.${billingCtx}`
 * expected = HMAC-SHA256(SUBSCRIPTION_INTERNAL_HMAC_SECRET, message)
 */
export function verifyAndDecryptHustleBillingCtx(input: {
  billingCtx: string
  billingTs: string | number
  billingSig: string
}): VerifyHustleBillingCtxResult {
  const hmacSecret = process.env.SUBSCRIPTION_INTERNAL_HMAC_SECRET
  const apiToken = process.env.SUBSCRIPTION_INTERNAL_API_TOKEN

  if (!hmacSecret || !apiToken) {
    return {
      ok: false,
      status: 500,
      message: "Billing context verification is not configured",
    }
  }

  const billingTs =
    typeof input.billingTs === "number"
      ? input.billingTs
      : Number.parseInt(String(input.billingTs), 10)

  if (!Number.isFinite(billingTs)) {
    return { ok: false, status: 401, message: "Invalid billing timestamp" }
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - billingTs) > TIMESTAMP_MAX_SKEW_SECONDS) {
    return {
      ok: false,
      status: 401,
      message: "Billing context timestamp is outside allowed window",
    }
  }

  const expectedHex = crypto
    .createHmac("sha256", hmacSecret)
    .update(`${billingTs}.${input.billingCtx}`)
    .digest("hex")

  const providedHex = input.billingSig.startsWith("sha256=")
    ? input.billingSig.slice("sha256=".length)
    : input.billingSig

  if (!timingSafeEqualHex(expectedHex, providedHex)) {
    return { ok: false, status: 401, message: "Invalid billing signature" }
  }

  let packed: Buffer
  try {
    packed = base64urlDecode(input.billingCtx)
  } catch {
    return { ok: false, status: 400, message: "Invalid billing context encoding" }
  }

  // [1 byte version][12 byte iv][16 byte authTag][ciphertext...]
  if (packed.length < 1 + 12 + 16 + 1) {
    return { ok: false, status: 400, message: "Invalid billing context payload" }
  }

  const version = packed[0]
  if (version !== BILLING_CTX_VERSION) {
    return { ok: false, status: 400, message: "Unsupported billing context version" }
  }

  const iv = packed.subarray(1, 13)
  const authTag = packed.subarray(13, 29)
  const ciphertext = packed.subarray(29)

  const key = Buffer.from(
    crypto.hkdfSync("sha256", hmacSecret, HKDF_SALT, HKDF_INFO, 32),
  )

  let plaintext: Buffer
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAAD(Buffer.from(apiToken, "utf8"))
    decipher.setAuthTag(authTag)
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch {
    return { ok: false, status: 401, message: "Failed to decrypt billing context" }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(plaintext.toString("utf8"))
  } catch {
    return { ok: false, status: 400, message: "Invalid billing context JSON" }
  }

  const payload = parsePayload(parsedJson)
  if (!payload) {
    return { ok: false, status: 400, message: "Invalid billing context fields" }
  }

  if (payload.exp < nowSeconds) {
    return { ok: false, status: 401, message: "Billing context expired" }
  }

  return { ok: true, payload }
}

export function resolveBillingOrgId(payload: HustleBillingCtxPayload): string | null {
  if (payload.workspaceType !== "organization") return null
  if (payload.orgId && payload.orgId.trim()) return payload.orgId.trim()
  if (payload.workspaceId.startsWith("org_")) return payload.workspaceId
  return payload.workspaceId.trim() || null
}
