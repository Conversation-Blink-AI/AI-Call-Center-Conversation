
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({
        success: false,
        message: "Email is required"
      }, { status: 400 })
    }

    console.log("[AUTH/FORGOT-PASSWORD] Attempting forgot password for:", email)

    // Get external API URL
    const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
    if (!externalApiUrl) {
      console.error("[AUTH/FORGOT-PASSWORD] External API URL not configured")
      return NextResponse.json({
        success: false,
        message: "External API configuration missing. Please configure FOREX_URL environment variable."
      }, { status: 500 })
    }

    // Prepare external API request
    const cleanApiUrl = externalApiUrl.endsWith('/') ? externalApiUrl.slice(0, -1) : externalApiUrl
    const apiEndpoint = `${cleanApiUrl}/api/accounts/forgot-password`

    const requestData = {
      email
    }

    console.log("[AUTH/FORGOT-PASSWORD] Calling external API:", apiEndpoint)
    console.log("[AUTH/FORGOT-PASSWORD] Payload:", JSON.stringify(requestData, null, 2))

    // Call external API for forgot password
    const externalResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    })

    const responseText = await externalResponse.text()
    console.log("[AUTH/FORGOT-PASSWORD] External API response status:", externalResponse.status)
    console.log("[AUTH/FORGOT-PASSWORD] External API response:", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))

    // Parse external API response
    let externalResult
    try {
      externalResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[AUTH/FORGOT-PASSWORD] Failed to parse external API response:", parseError)
      return NextResponse.json({
        success: false,
        message: "Invalid response from password reset service"
      }, { status: 500 })
    }

    // Check if external API call failed
    if (!externalResponse.ok || externalResult.status !== "success") {
      console.log("[AUTH/FORGOT-PASSWORD] External API failed:", externalResult.message)
      return NextResponse.json({
        success: false,
        message: externalResult.message || "Failed to send password reset email"
      }, { status: 400 })
    }

    console.log("[AUTH/FORGOT-PASSWORD] Password reset email sent successfully")

    return NextResponse.json({
      success: true,
      message: externalResult.message || "Password reset instructions have been sent to your email"
    })

  } catch (error: any) {
    console.error("[AUTH/FORGOT-PASSWORD] Error:", error)

    // Handle network errors
    if (error.message?.includes('fetch')) {
      return NextResponse.json({
        success: false,
        message: "Unable to connect to password reset service. Please try again later."
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 })
  }
}
