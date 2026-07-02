export type VerifyForexAccountTokenResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

function getForexApiUrl(): string | null {
  const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
  if (!externalApiUrl) return null
  return externalApiUrl.endsWith("/") ? externalApiUrl.slice(0, -1) : externalApiUrl
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
    console.log("[FOREX-VERIFY] Verifying token with Forex API...")

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: token }),
    })

    const responseText = await response.text()
    let result: { status?: string; message?: string }

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

    if (!response.ok || result.status !== "success") {
      console.log("[FOREX-VERIFY] Token verification failed:", result.message || response.status)
      return {
        ok: false,
        status: 401,
        message: result.message || "Token verification failed",
      }
    }

    console.log("[FOREX-VERIFY] Token verified successfully")
    return { ok: true }
  } catch (error: unknown) {
    console.error("[FOREX-VERIFY] Error calling Forex API:", error)
    const message =
      error instanceof Error && (error.message.includes("fetch") || (error as NodeJS.ErrnoException).code === "ECONNREFUSED")
        ? "Unable to connect to authentication service. Please try again later."
        : "Token verification failed"

    return { ok: false, status: 503, message }
  }
}
