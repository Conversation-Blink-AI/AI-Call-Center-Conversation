
"use client"

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import Link from "next/link"

export default function VerificationPendingPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Force light mode styles on this page regardless of global theme */}
      <Card className="w-full max-w-md bg-white text-slate-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Mail className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Verify Your Account</CardTitle>
          <CardDescription>
            Please verify your email address to access the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4 text-slate-900">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              We sent a verification email to:
            </p>
            <p className="font-medium text-gray-900">
              {email || 'your email address'}
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Please check your inbox and click the verification link to activate your account.
            </p>
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/login">
                Go to Login
              </Link>
            </Button>
          </div>

          <div className="pt-4 text-xs text-gray-500">
            <p>Didn't receive the email? Check your spam folder or contact support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
