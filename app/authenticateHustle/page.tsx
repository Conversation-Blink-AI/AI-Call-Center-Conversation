"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthenticateHustlePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setError("No token provided")
      setLoading(false)
      return
    }

    const signIn = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/auth/hustle-signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ token })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json().catch(() => ({}))
        if (!data.success) {
          throw new Error(data.message || "Authentication failed")
        }

        router.replace("/dashboard")
      } catch (err: any) {
        console.error("[AUTHENTICATE-HUSTLE] Sign-in failed:", err)
        setError(err?.message || "Authentication failed")
        setLoading(false)
      }
    }

    signIn()
  }, [router, searchParams])

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
