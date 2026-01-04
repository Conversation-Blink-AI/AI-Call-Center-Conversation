import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

// Simple test endpoint to verify authentication is working
export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll()
  const authToken = req.cookies.get('auth-token')?.value
  
  const debugInfo = {
    totalCookies: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    hasAuthToken: !!authToken,
    authTokenLength: authToken?.length || 0,
    cookieHeader: req.headers.get('cookie')?.substring(0, 100) || 'none'
  }
  
  const user = await getUserFromRequest(req)
  
  return NextResponse.json({
    authenticated: !!user,
    user: user ? { id: user.id, email: user.email } : null,
    debug: debugInfo
  })
}
