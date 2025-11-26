
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Clear the auth cookie
    const cookieStore = await cookies()
    cookieStore.delete("auth-token")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[AUTH/LOGOUT] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Logout failed" 
    }, { status: 500 })
  }
}
