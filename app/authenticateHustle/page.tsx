"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function AuthenticateHustleContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const signInStartedRef = useRef(false)

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setError("No token provided")
      setLoading(false)
      return
    }

    if (signInStartedRef.current) {
      return
    }
    signInStartedRef.current = true

    const signIn = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/auth/hustle-signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ token }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.success) {
          const errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        if (data.token || data.externalToken) {
          const tokenToStore = data.token || data.externalToken
          localStorage.setItem("auth-token", tokenToStore)
        }

        // Hard navigation ensures the auth cookie is committed before dashboard loads.
        window.location.replace("/dashboard")
      } catch (err: unknown) {
        console.error("[AUTHENTICATE-HUSTLE] Sign-in failed:", err)
        signInStartedRef.current = false
        setError(err instanceof Error ? err.message : "Authentication failed")
        setLoading(false)
      }
    }

    signIn()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accessing Account</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Authenticating...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthenticateHustlePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Accessing Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Authenticating...</div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthenticateHustleContent />
    </Suspense>
  )
}
