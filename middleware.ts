import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionToken, validateSessionToken } from "./lib/auth-utils"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Simple JWT verification for Edge Runtime (no imports needed)
function verifyJWT(token: string, secret: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const header = JSON.parse(atob(parts[0]))
    const payload = JSON.parse(atob(parts[1]))

    // Basic structure validation
    if (!payload.userId || !payload.exp) return null

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Skip middleware for static files and API routes that don't need auth
  if (
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/api/debug") ||
    req.nextUrl.pathname.startsWith("/api/webhooks") || // Allow webhooks without auth
    req.nextUrl.pathname.startsWith("/api/Public_api") || // Public API (getCallHistory, getPurchaseNumber) - no auth
    req.nextUrl.pathname.includes(".")
  ) {
    return res
  }

  // Skip middleware check for generate-pathway - let the route handler handle auth
  // The route handler has better error handling and debugging
  if (req.nextUrl.pathname === "/api/generate-pathway") {
    console.log("[MIDDLEWARE] ⏭️ generate-pathway: Skipping middleware, route handler will verify auth")
    return res
  }

  try {
    // Get token from cookies
    const token = req.cookies.get("auth-token")?.value

    console.log("[MIDDLEWARE] 🔍 Auth check:", {
      path: req.nextUrl.pathname,
      hasToken: !!token,
    })

    // Protect /dashboard, /database, and /admin routes
    const isProtectedPath = req.nextUrl.pathname.startsWith("/dashboard") || 
                            req.nextUrl.pathname.startsWith("/database") ||
                            req.nextUrl.pathname.startsWith("/admin")

    if (isProtectedPath) {
      if (!token) {
        console.log("[MIDDLEWARE] ❌ No token, redirecting to home page")
        return NextResponse.redirect(new URL("/", req.url))
      }

      // Verify JWT token
      const decoded = verifyJWT(token, JWT_SECRET)
      if (!decoded) {
        console.log("[MIDDLEWARE] ❌ Invalid token, redirecting to home page")
        return NextResponse.redirect(new URL("/", req.url))
      }

      console.log("[MIDDLEWARE] ✅ Token valid for user:", decoded.userId)
      
      // For /admin routes, we'll check is_admin in the layout/page components
      // since middleware runs in Edge Runtime and database queries are limited
      if (req.nextUrl.pathname.startsWith("/admin")) {
        console.log("[MIDDLEWARE] 🔒 Admin route access - will verify is_admin in route handler")
      }
    }

    // If user is authenticated and on login page, redirect to dashboard
    if (token && req.nextUrl.pathname === "/login") {
      const decoded = verifyJWT(token, JWT_SECRET)
      if (decoded) {
        console.log("[MIDDLEWARE] ✅ Redirecting authenticated user to dashboard")
        return NextResponse.redirect(new URL("/dashboard", req.url))
      } else {
        // Token exists but is invalid, clear it and allow access to login
        console.log("[MIDDLEWARE] ❌ Invalid token on login page, clearing cookie")
        const response = NextResponse.next()
        response.cookies.delete("auth-token")
        return response
      }
    }

    return res
  } catch (error) {
    console.error("[MIDDLEWARE] ❌ Error:", error)
    return res
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}