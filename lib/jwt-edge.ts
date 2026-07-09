/**
 * Edge-runtime JWT verification (HS256) using Web Crypto.
 * Mirrors jsonwebtoken.verify for middleware — must stay in sync with lib/auth-utils.ts.
 */

export interface JwtPayload {
  userId: string
  exp: number
  [key: string]: unknown
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function base64UrlToJson<T>(base64Url: string): T {
  const json = new TextDecoder().decode(base64UrlToUint8Array(base64Url))
  return JSON.parse(json) as T
}

/** Verify HS256 JWT signature and expiration. Returns null if invalid or expired. */
export async function verifyJwtEdge(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts

    const header = base64UrlToJson<{ alg?: string }>(headerB64)
    if (header.alg && header.alg !== "HS256") return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )

    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlToUint8Array(signatureB64)
    const valid = await crypto.subtle.verify("HMAC", key, signature, data)
    if (!valid) return null

    const payload = base64UrlToJson<JwtPayload>(payloadB64)
    if (!payload.userId || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}
