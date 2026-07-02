import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildHustleSignInResponse, completeHustleSignIn } from "@/lib/hustle-signin"

const hustleSignInSchema = z.object({
  token: z.string().min(1).max(8192),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = hustleSignInSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 },
      )
    }

    const { token } = parsed.data

    console.log("[HUSTLE-SIGNIN] Starting Forex-verified auto login...")

    const result = await completeHustleSignIn(token)
    if (!result.ok) {
      console.log("[HUSTLE-SIGNIN] Sign-in failed:", result.message)
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json(buildHustleSignInResponse(result))
  } catch (error: unknown) {
    console.error("[HUSTLE-SIGNIN] Error:", error)
    const isProd = process.env.NODE_ENV === "production"
    const message =
      isProd
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Internal server error"

    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
