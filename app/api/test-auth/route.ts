import { NextResponse } from "next/server"
import { getSessionToken } from "@/lib/auth-utils"

export async function GET() {
  console.log("[TEST-AUTH] 🧪 Testing authentication...")

  try {
    const sessionToken = await getSessionToken()

    if (!sessionToken) {
      console.log("[TEST-AUTH] ❌ No session token found")
      return NextResponse.json(
        {
          authenticated: false,
          error: "No session token found",
        },
        { status: 401 },
      )
    }

    console.log("[TEST-AUTH] ✅ User authenticated with Replit DB")

    return NextResponse.json({
      authenticated: true,
      message: "Authentication successful with Replit DB",
    })
  } catch (error) {
    console.error("[TEST-AUTH] ❌ Unexpected error:", error)
    return NextResponse.json(
      {
        authenticated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}