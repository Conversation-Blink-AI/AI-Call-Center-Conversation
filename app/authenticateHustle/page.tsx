
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function AuthenticateHustlePage() {
  const [countdown, setCountdown] = useState(25)
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshAuth } = useAuth()

  const token = searchParams.get("token")

  useEffect(() => {
    const authenticateWithToken = async () => {
      if (!token) {
        console.log("[AUTH-HUSTLE] No token found in URL")
        setStatus("error")
        setMessage("No authentication token found in URL")
        return
      }

      try {
        console.log("[AUTH-HUSTLE] Attempting to authenticate with token")
        setStatus("loading")

        // Validate the token by making an API call
        const response = await fetch("/api/auth/validate-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ token }),
        })

        const result = await response.json()

        if (result.success && result.user) {
          console.log("[AUTH-HUSTLE] Token validation successful")
          setStatus("success")
          setMessage("Authentication successful! Redirecting to dashboard...")
          
          // Update auth context to reflect the new session
          try {
            await refreshAuth()
            console.log("[AUTH-HUSTLE] Auth context refreshed successfully")
          } catch (error) {
            console.log("[AUTH-HUSTLE] Auth context refresh failed, but token validation succeeded")
          }
          
          // Redirect to dashboard after 1 second
          setTimeout(() => {
            router.push("/dashboard")
          }, 1000)
        } else {
          console.log("[AUTH-HUSTLE] Token validation failed:", result.message)
          setStatus("error")
          setMessage("Authentication failed: " + (result.message || "Invalid token"))
        }
      } catch (error: any) {
        console.error("[AUTH-HUSTLE] Authentication error:", error)
        setStatus("error")
        setMessage("Authentication failed: " + error.message)
      }
    }

    authenticateWithToken()
  }, [token, router])

  // Countdown timer for error cases
  useEffect(() => {
    if (status === "error") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            router.push("/")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [status, router])

  const handleGoToHome = () => {
    router.push("/")
  }

  const handleGoToDashboard = () => {
    router.push("/dashboard")
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          {/* Loading Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-blue-500 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl font-semibold text-gray-300">
            Authenticating User
          </h1>

          {/* Loading Message */}
          <p className="text-blue-400 text-lg">
            Validating authentication token...
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl font-semibold text-gray-300">
            Authentication Successful!
          </h1>

          {/* Success Message */}
          <p className="text-green-400 text-lg">
            {message}
          </p>

          {/* Go to Dashboard Button */}
          <Button 
            onClick={handleGoToDashboard}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Error state (original design)
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        {/* Red X Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-red-500 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl font-semibold text-gray-300">
          Authenticating User
        </h1>

        {/* Error Message */}
        <div className="space-y-2">
          <p className="text-red-400 text-lg">
            Authentication failed: {message}
          </p>
          <p className="text-red-400 text-lg">
            Redirecting to home in {countdown}s...
          </p>
        </div>

        {/* Countdown Text */}
        <p className="text-gray-500 text-sm">
          Redirecting automatically in {countdown} seconds
        </p>

        {/* Go to Home Button */}
        <Button 
          onClick={handleGoToHome}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
        >
          Go to Home
        </Button>
      </div>
    </div>
  )
}
