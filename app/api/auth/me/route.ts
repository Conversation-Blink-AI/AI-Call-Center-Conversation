import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 [AUTH-ME] Processing auth check...")

    const user = await getUserFromRequest(req)
    if (!user) {
      console.log("❌ [AUTH-ME] No user found")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 [AUTH-ME] Found user:", { id: user.id, email: user.email })

    // Verify external token is still valid if available
    if (user.external_token || user.externalToken) {
      const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
      if (externalApiUrl) {
        try {
          // You can add external token validation here if needed
          console.log("🔍 [AUTH-ME] External token available for user:", user.email)
        } catch (externalError) {
          console.log("⚠️ [AUTH-ME] External token validation failed:", externalError)
        }
      }
    }

    // Ensure we return consistent user data structure
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || user.first_name || 'User',
      lastName: user.lastName || user.last_name || '',
      company: user.company || '',
      role: user.role || 'user',
      phoneNumber: user.phoneNumber || user.phone_number || '',
      createdAt: user.createdAt || user.created_at,
      updatedAt: user.updatedAt || user.updated_at,
      lastLogin: user.lastLogin || user.last_login,
      verified: user.verified || user.is_verified || false,
      platforms: user.platforms || [],
      externalId: user.external_id,
      externalToken: user.external_token
    }

    return NextResponse.json({ 
      user: { 
        ok: true, 
        value: userData 
      } 
    })
  } catch (error) {
    console.error("Error in /api/auth/me:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}