
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Mail } from "lucide-react"

function VerifyEmailContent() {
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error">("pending")
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  useEffect(() => {
    if (!email) {
      setError("Email parameter is missing")
      return
    }

    // Check current verification status
    checkVerificationStatus()
  }, [email])

  const checkVerificationStatus = async () => {
    if (!email) return

    try {
      const response = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(email)}`)
      const result = await response.json()

      if (result.success && result.isVerified) {
        setVerificationStatus("success")
        setMessage("Your email is already verified!")
        setTimeout(() => router.push("/login"), 2000)
      }
    } catch (error) {
      console.error("Error checking verification status:", error)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode.trim()) {
      setError("Please enter the verification code")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          verificationToken: verificationCode.trim()
        }),
      })

      const result = await response.json()

      if (result.success) {
        setVerificationStatus("success")
        setMessage("Email verified successfully! Redirecting to dashboard...")
        setTimeout(() => router.push("/dashboard"), 2000)
      } else {
        setError(result.message || "Verification failed")
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resendVerification = async () => {
    setLoading(true)
    setError("")
    setMessage("Resend functionality will be implemented in Phase 2")
    setLoading(false)
  }

  if (verificationStatus === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You will be redirected shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification code to {email}. Please enter it below to complete your registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={loading}
                className="text-center text-lg tracking-wider"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              onClick={resendVerification}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800"
            >
              Resend verification email
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-800">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
