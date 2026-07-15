import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJwtEdge } from "./lib/jwt-edge"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function clearAuthCookie(response: NextResponse) {
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  response.cookies.delete("auth-token")
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Normalize FAQ casing without a browser redirect loop (macOS FS is case-insensitive,
  // so a next.config redirect from /FAQ → /faq can infinite-loop).
  if (pathname.toLowerCase() === "/faq" && pathname !== "/faq") {
    const url = req.nextUrl.clone()
    url.pathname = "/faq"
    return NextResponse.rewrite(url)
  }

  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/debug") ||
    pathname.startsWith("/api/webhooks") || // Allow webhooks without auth
    pathname.startsWith("/api/v1/integrations/hustle") || // Hustle org/member sync
    pathname.startsWith("/api/Public_api") || // Public API (getCallHistory, getPurchaseNumber) - no auth
    pathname.includes(".")
  ) {
    return res
  }

  // Skip middleware check for generate-pathway - let the route handler handle auth
  // The route handler has better error handling and debugging
  if (pathname === "/api/generate-pathway") {
    console.log("[MIDDLEWARE] ⏭️ generate-pathway: Skipping middleware, route handler will verify auth")
    return res
  }

  try {
    // Get token from cookies
    const token = req.cookies.get("auth-token")?.value

    console.log("[MIDDLEWARE] 🔍 Auth check:", {
      path: pathname,
      hasToken: !!token,
    })

    // Protect /dashboard, /database, and /admin routes
    const isProtectedPath = pathname.startsWith("/dashboard") || 
                            pathname.startsWith("/database") ||
                            pathname.startsWith("/admin")

    if (isProtectedPath) {
      if (!token) {
        console.log("[MIDDLEWARE] ❌ No token, redirecting to login")
        return NextResponse.redirect(new URL("/login", req.url))
      }

      const decoded = await verifyJwtEdge(token, JWT_SECRET)
      if (!decoded) {
        console.log("[MIDDLEWARE] ❌ Invalid token, clearing cookie and redirecting to login")
        const response = NextResponse.redirect(new URL("/login", req.url))
        clearAuthCookie(response)
        return response
      }

      console.log("[MIDDLEWARE] ✅ Token valid for user:", decoded.userId)
      
      // For /admin routes, we'll check is_admin in the layout/page components
      // since middleware runs in Edge Runtime and database queries are limited
      if (pathname.startsWith("/admin")) {
        console.log("[MIDDLEWARE] 🔒 Admin route access - will verify is_admin in route handler")
      }
    }

    // If user is authenticated and on login page, redirect to dashboard
    if (token && pathname === "/login") {
      const decoded = await verifyJwtEdge(token, JWT_SECRET)
      if (decoded) {
        console.log("[MIDDLEWARE] ✅ Redirecting authenticated user to dashboard")
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }

      console.log("[MIDDLEWARE] ❌ Invalid token on login page, clearing cookie")
      const response = NextResponse.next()
      clearAuthCookie(response)
      return response
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