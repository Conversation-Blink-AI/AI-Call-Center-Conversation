
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Clear the auth cookie with the same settings used when setting it
    const cookieStore = await cookies()
    cookieStore.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/", // Must match the path used when setting the cookie
    })
    
    // Also try deleting it (some browsers need both)
    cookieStore.delete("auth-token")

    // Clear org workspace proxy cookie
    cookieStore.set("cc-workspace-org-id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })
    cookieStore.delete("cc-workspace-org-id")

    console.log("[AUTH/LOGOUT] ✅ Cookie cleared successfully")
    
    // Return response with no-cache headers to prevent caching
    const response = NextResponse.json({ success: true })
    response.cookies.set("cc-workspace-org-id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error: any) {
    console.error("[AUTH/LOGOUT] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Logout failed" 
    }, { status: 500 })
  }
}
