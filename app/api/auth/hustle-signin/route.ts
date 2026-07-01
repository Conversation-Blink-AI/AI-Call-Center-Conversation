import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import * as jwt from "jsonwebtoken"
import { z } from "zod"
import { decodeHustleToken } from "@/lib/hustle-token"
import { syncUserFromHustleToken } from "@/lib/hustle-user-sync"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

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

    console.log("[HUSTLE-SIGNIN] Validating Hustle token...")

    const decodeResult = decodeHustleToken(token)
    if (!decodeResult.ok) {
      console.log("[HUSTLE-SIGNIN] Token decode failed:", decodeResult.message)
      return NextResponse.json(
        { success: false, message: decodeResult.message },
        { status: decodeResult.status },
      )
    }

    const decoded = decodeResult.decoded
    const externalId = decoded.id || decoded._id
    const userEmail = decoded.email

    if (!externalId || !userEmail) {
      return NextResponse.json(
        { success: false, message: "Invalid user data from token" },
        { status: 400 },
      )
    }

    console.log("[HUSTLE-SIGNIN] Token decoded for user:", userEmail)

    const { user, forexAuthFields } = await syncUserFromHustleToken(token, decoded)

    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    const cookieStore = await cookies()
    cookieStore.set("auth-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    })

    console.log("[HUSTLE-SIGNIN] Local session cookie set successfully")

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName || "User",
        lastName: user.last_name || user.lastName || "",
        company: user.company || "",
        role: user.role || "client",
        phoneNumber: user.phone_number || user.phoneNumber || "",
        verified: user.verified || user.is_verified || false,
        platforms: user.platforms || decoded.platforms || [],
        permissions: forexAuthFields.permissions,
        orgMemberships: forexAuthFields.orgMemberships,
        activeOrgId: forexAuthFields.activeOrgId,
        activeRole: forexAuthFields.activeRole,
      },
      token,
      externalToken: token,
    })
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
