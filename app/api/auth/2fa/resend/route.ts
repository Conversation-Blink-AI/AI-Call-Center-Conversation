import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { pending2FAToken } = await request.json()

    if (!pending2FAToken) {
      return NextResponse.json({
        success: false,
        message: "pending2FAToken is required"
      }, { status: 400 })
    }

    const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
    if (!externalApiUrl) {
      console.error("[AUTH/2FA-RESEND] External API URL not configured")
      return NextResponse.json({
        success: false,
        message: "External API configuration missing. Please configure FOREX_URL environment variable."
      }, { status: 500 })
    }

    const cleanApiUrl = externalApiUrl.endsWith('/') ? externalApiUrl.slice(0, -1) : externalApiUrl
    const tryResend = async (path: string) => {
      const apiEndpoint = `${cleanApiUrl}${path}`
      console.log("[AUTH/2FA-RESEND] Calling external API:", apiEndpoint)
      const externalResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pending2FAToken })
      })
      const responseText = await externalResponse.text()
      console.log("[AUTH/2FA-RESEND] External API response status:", externalResponse.status)
      console.log("[AUTH/2FA-RESEND] External API response:", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))
      let externalResult
      try {
        externalResult = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[AUTH/2FA-RESEND] Failed to parse external API response:", parseError)
        return { externalResponse, externalResult: null }
      }
      return { externalResponse, externalResult }
    }

    let { externalResponse, externalResult } = await tryResend("/api/accounts/2fa/resend")

    if (externalResponse.status === 404 || externalResult?.message?.toLowerCase?.().includes("cannot post")) {
      ;({ externalResponse, externalResult } = await tryResend("/api/accounts/2fa/verify"))
    }

    if (!externalResponse.ok || !externalResult) {
      if (externalResult?.message?.toLowerCase?.().includes("data and hash arguments required")) {
        return NextResponse.json({
          success: false,
          message: "Unable to resend the code. Please try again."
        }, { status: 400 })
      }
      return NextResponse.json({
        success: false,
        message: externalResult?.message || "Unable to resend the code"
      }, { status: externalResponse.status })
    }

    return NextResponse.json({
      success: true,
      message: externalResult.message || "Verification code sent"
    })
  } catch (error: any) {
    console.error("[AUTH/2FA-RESEND] Unexpected error:", error)
    return NextResponse.json({
      success: false,
      message: error.message || "An internal server error occurred. Please try again later."
    }, { status: 500 })
  }
}
