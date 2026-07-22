"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const RESEND_COOLDOWN_SECONDS = 240

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function clearPending2FA() {
  try {
    sessionStorage.removeItem("pending-2fa-token")
    sessionStorage.removeItem("pending-2fa-email")
    sessionStorage.removeItem("pending-2fa-message")
  } catch {}
}

export default function Verify2FAPage() {
  const router = useRouter()
  const { refreshAuth } = useAuth()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [infoMessage, setInfoMessage] = useState(
    "Please check your email for the verification code",
  )
  const [email, setEmail] = useState("")
  const [resendMessage, setResendMessage] = useState("")
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    try {
      const pendingToken = sessionStorage.getItem("pending-2fa-token")
      if (!pendingToken) {
        router.push("/login")
        return
      }
      const storedMessage = sessionStorage.getItem("pending-2fa-message")
      const storedEmail = sessionStorage.getItem("pending-2fa-email")
      if (storedMessage) {
        setInfoMessage(storedMessage)
      }
      if (storedEmail) {
        setEmail(storedEmail)
      }
      setIsReady(true)
    } catch {
      router.push("/login")
    }
  }, [router])

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const handleCodeChange = useCallback((value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6)
    setCode(digitsOnly)
    if (error) setError("")
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setResendMessage("")

    let pendingToken = ""
    try {
      pendingToken = sessionStorage.getItem("pending-2fa-token") || ""
    } catch {}

    if (!pendingToken) {
      setError("Your verification session expired. Please sign in again.")
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

      clearPending2FA()
      await refreshAuth()
      router.push("/dashboard")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return

    setResendMessage("")
    setError("")
    setIsResending(true)

    let pendingToken = ""
    try {
      pendingToken = sessionStorage.getItem("pending-2fa-token") || ""
    } catch {}

    if (!pendingToken) {
      setError("Your verification session expired. Please sign in again.")
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

      setResendMessage(result.message || "A new verification code has been sent.")
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setIsResending(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to resend the code. Please try again."
      setError(message)
      setIsResending(false)
    }
  }

  const handleBackToSignIn = () => {
    clearPending2FA()
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000023]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000023] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span className="bg-gradient-to-r from-purple-500 via-pink-600 to-blue-500 bg-clip-text text-transparent">
              Conversation
            </span>
          </h1>
        </div>

        <div className="rounded-2xl border border-gray-700/80 bg-gray-900/70 p-8 shadow-2xl shadow-purple-950/20 backdrop-blur-sm">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-400">
              Enter the 6-digit code sent to your email
              {email ? (
                <>
                  <br />
                  <span className="text-gray-300 font-medium">{email}</span>
                </>
              ) : null}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : resendMessage ? (
              <Alert className="border-green-500/40 bg-green-500/10 text-green-100">
                <AlertDescription>{resendMessage}</AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-purple-500/40 bg-purple-500/10 text-purple-100">
                <Mail className="h-4 w-4 text-purple-300" />
                <AlertDescription>{infoMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="0 0 0 0 0 0"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                required
                disabled={isLoading}
                maxLength={6}
                aria-label="6-digit verification code"
                className="h-14 px-4 text-center text-2xl tracking-[0.55em] font-medium bg-gray-800/80 border-gray-600 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500 placeholder:text-gray-500 placeholder:tracking-[0.55em]"
              />

              <div className="flex justify-end">
                {resendCooldown > 0 ? (
                  <span className="text-sm text-purple-300/80">
                    Resend in {formatCountdown(resendCooldown)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-sm text-purple-400 hover:text-purple-300 disabled:opacity-60 transition-colors"
                  >
                    {isResending ? "Sending new code..." : "Resend code"}
                  </button>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold transition-all duration-200"
              disabled={isLoading || code.length !== 6}
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
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Back to Sign In?{" "}
            <Link
              href="/login"
              onClick={handleBackToSignIn}
              className="font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              Click Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
