"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function Verify2FAPage() {
  const router = useRouter()
  const { refreshAuth } = useAuth()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendMessage, setResendMessage] = useState("")
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    try {
      const pendingToken = sessionStorage.getItem("pending-2fa-token")
      if (!pendingToken) {
        router.push("/login")
      }
    } catch {
      router.push("/login")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    let pendingToken = ""
    try {
      pendingToken = sessionStorage.getItem("pending-2fa-token") || ""
    } catch {}

    if (!pendingToken) {
      setError("Your verification session expired. Please login again.")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ pending2FAToken: pendingToken, code }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.message || "Invalid verification code")
        setIsLoading(false)
        return
      }

      if (result.token || result.externalToken) {
        const tokenToStore = result.token || result.externalToken
        localStorage.setItem("auth-token", tokenToStore)
      }

      try {
        sessionStorage.removeItem("pending-2fa-token")
        sessionStorage.removeItem("pending-2fa-email")
      } catch {}

      await refreshAuth()
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setResendMessage("")
    setError("")
    setIsResending(true)

    let pendingToken = ""
    try {
      pendingToken = sessionStorage.getItem("pending-2fa-token") || ""
    } catch {}

    if (!pendingToken) {
      setError("Your verification session expired. Please login again.")
      setIsResending(false)
      return
    }

    try {
      const response = await fetch("/api/auth/2fa/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pending2FAToken: pendingToken }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.message || "Unable to resend the code. Please try again.")
        setIsResending(false)
        return
      }

      setResendMessage(result.message || "Verification code sent.")
      setIsResending(false)
    } catch (err: any) {
      setError(err.message || "Unable to resend the code. Please try again.")
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000023] px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Enter verification code</h1>
          <p className="text-gray-400 mt-2">We sent a code to your email.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {resendMessage && (
            <Alert>
              <AlertDescription>{resendMessage}</AlertDescription>
            </Alert>
          )}

          <Input
            id="code"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            disabled={isLoading}
            className="h-12 px-4 text-base bg-gray-800 border-gray-600 text-white rounded-lg focus:border-purple-500 focus:ring-purple-500 placeholder:text-gray-400"
          />

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all duration-200"
            disabled={isLoading || code.length < 4}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="w-full text-sm text-purple-400 hover:text-purple-300 disabled:opacity-60"
          >
            {isResending ? "Sending new code..." : "Resend verification code"}
          </button>
        </form>
      </div>
    </div>
  )
}
