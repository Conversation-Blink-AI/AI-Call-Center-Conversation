export type VerifyForexAccountTokenResult =
  | { ok: true; token: string; email: string | null }
  | { ok: false; status: number; message: string }

const INVALID_SESSION_MESSAGE =
  "Hustle session is invalid. Open Call Center from Hustle again."

const PENDING_2FA_MESSAGE =
  "Two-factor authentication is still pending. Finish it on Hustle, then open Call Center again."

const SESSION_REJECTED_MESSAGE =
  "Hustle did not accept this session. Open Call Center from Hustle again."

function getForexApiUrl(): string | null {
  const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
  if (!externalApiUrl) return null
  return externalApiUrl.endsWith("/") ? externalApiUrl.slice(0, -1) : externalApiUrl
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function isThreePartJwt(token: string): boolean {
  const parts = token.split(".")
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

function isEmailVerificationCodeMessage(message: string): boolean {
  return message.toLowerCase().includes("verification link is invalid or has expired")
}

function rejectionCode(
  body: Record<string, unknown>,
): "INVALID_SESSION" | "PENDING_2FA" | "VERIFICATION_INVALID" | null {
  const candidates = [body.code, body.error, body.errorCode, body.status]
  for (const candidate of candidates) {
    const value = readString(candidate)?.toUpperCase()
    if (value === "INVALID_SESSION" || value === "PENDING_2FA" || value === "VERIFICATION_INVALID") {
      return value
    }
  }
  return null
}

/**
 * Interpret POST /api/accounts/verify.
 * A three-part session JWT is not an email verification code. The 5-minute
 * billing window is not applied here.
 */
export function interpretHustleVerifyResponse(input: {
  httpStatus: number
  body: unknown
  submittedToken: string
}): VerifyForexAccountTokenResult {
  const body =
    input.body && typeof input.body === "object"
      ? (input.body as Record<string, unknown>)
      : {}

  const message = readString(body.message) ?? ""
  const statusText = readString(body.status)?.toLowerCase()
  const succeeded =
    input.httpStatus >= 200 &&
    input.httpStatus < 300 &&
    (body.success === true || statusText === "success")

  if (succeeded) {
    const data =
      body.data && typeof body.data === "object"
        ? (body.data as Record<string, unknown>)
        : {}
    return {
      ok: true,
      token: readString(data.token) ?? input.submittedToken,
      email: readString(data.email),
    }
  }

  const code = rejectionCode(body)
  if (code === "INVALID_SESSION") {
    return { ok: false, status: 401, message: INVALID_SESSION_MESSAGE }
  }
  if (code === "PENDING_2FA") {
    return { ok: false, status: 401, message: PENDING_2FA_MESSAGE }
  }

  // Accounts used to look `code` up as an email link. A session JWT never matches.
  // That response is not a session rejection. INVALID_SESSION and PENDING_2FA are.
  if (
    isThreePartJwt(input.submittedToken) &&
    (code === "VERIFICATION_INVALID" || isEmailVerificationCodeMessage(message))
  ) {
    return { ok: true, token: input.submittedToken, email: null }
  }

  if (
    isThreePartJwt(input.submittedToken) &&
    (input.httpStatus === 401 || input.httpStatus === 403)
  ) {
    return { ok: false, status: 401, message: SESSION_REJECTED_MESSAGE }
  }

  return {
    ok: false,
    status: input.httpStatus || 401,
    message: message || "Token verification failed",
  }
}

export async function verifyForexAccountToken(
  token: string,
): Promise<VerifyForexAccountTokenResult> {
  const baseUrl = getForexApiUrl()

  if (!baseUrl) {
    console.error("[FOREX-VERIFY] External API URL not configured")
    return {
      ok: false,
      status: 500,
      message: "External API configuration missing. Please configure FOREX_URL environment variable.",
    }
  }

  const apiEndpoint = `${baseUrl}/api/accounts/verify`

  try {
    console.log("[FOREX-VERIFY] Verifying Hustle session with accounts API...")

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: token, token }),
    })

    const responseText = await response.text()
    let result: unknown

    try {
      result = JSON.parse(responseText)
    } catch {
      console.error("[FOREX-VERIFY] Failed to parse Forex API response:", responseText.substring(0, 200))
      return {
        ok: false,
        status: response.ok ? 500 : response.status || 500,
        message: "Invalid response from authentication service",
      }
    }

    const interpreted = interpretHustleVerifyResponse({
      httpStatus: response.status,
      body: result,
      submittedToken: token,
    })

    const rawBody =
      result && typeof result === "object" ? (result as Record<string, unknown>) : {}
    const rawMessage = readString(rawBody.message) ?? ""
    const rawCode = readString(rawBody.code)?.toUpperCase()
    if (
      interpreted.ok &&
      isThreePartJwt(token) &&
      (rawCode === "VERIFICATION_INVALID" || isEmailVerificationCodeMessage(rawMessage))
    ) {
      console.log(
        "[FOREX-VERIFY] Accounts verify treated a session JWT as an email code. Continuing with the session JWT.",
      )
    }

    if (!interpreted.ok) {
      console.log("[FOREX-VERIFY] Session verification failed:", interpreted.message)
      return interpreted
    }

    console.log("[FOREX-VERIFY] Hustle session verified successfully")
    return interpreted
  } catch (error: unknown) {
    console.error("[FOREX-VERIFY] Error calling Forex API:", error)
    const message =
      error instanceof Error && (error.message.includes("fetch") || (error as NodeJS.ErrnoException).code === "ECONNREFUSED")
        ? "Unable to connect to authentication service. Please try again later."
        : "Token verification failed"

    return { ok: false, status: 503, message }
  }
}
