import { NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const phoneParam = searchParams.get("phone_number") || searchParams.get("phone")
    if (!phoneParam) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    const apiKey = process.env.BLAND_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 500 })
    }

    const formattedPhoneNumber = phoneParam.replace(/^\+|^%2B/, "")
    const blandUrl = `https://api.bland.ai/v1/inbound/${encodeURIComponent(formattedPhoneNumber)}`

    const response = await fetch(blandUrl, {
      method: "GET",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      return NextResponse.json(
        {
          error: "Failed to fetch inbound number from Bland.ai",
          details: errorData,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      voice: data.voice ?? null,
      model: data.model ?? null,
      background_track: data.background_track ?? null,
      language: data.language ?? null,
      interruption_threshold: data.interruption_threshold ?? null,
      record: typeof data.record === "boolean" ? data.record : null,
      summary_prompt: data.summary_prompt ?? null,
      noise_cancellation: typeof data.noise_cancellation === "boolean" ? data.noise_cancellation : null,
      ignore_button_press: typeof data.ignore_button_press === "boolean" ? data.ignore_button_press : null,
    })
  } catch (error: any) {
    console.error("❌ [INBOUND-GET] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
