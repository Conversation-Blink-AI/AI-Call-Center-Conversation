import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildHustleSignInResponse, completeHustleSignIn } from "@/lib/hustle-signin"
import { mapHustleSignInError } from "@/lib/hustle-signin-errors"

const validateTokenSchema = z.object({
  token: z.string().min(1).max(8192),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = validateTokenSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 },
      )
    }

    const { token } = parsed.data

    console.log("[VALIDATE-TOKEN] Starting Forex-verified token validation...")

    const result = await completeHustleSignIn(token)
    if (!result.ok) {
      console.log("[VALIDATE-TOKEN] Validation failed:", result.message)
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json(buildHustleSignInResponse(result))
  } catch (error: unknown) {
    console.error("[VALIDATE-TOKEN] Error:", error)
    const { status, message } = mapHustleSignInError(error)
    return NextResponse.json({ success: false, message }, { status })
  }
}
