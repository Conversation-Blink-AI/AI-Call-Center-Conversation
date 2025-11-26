
"use client"

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function VerificationPendingPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Simulate refresh action
    setTimeout(() => {
      setIsRefreshing(false)
      window.location.reload()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Mail className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Email Not Verified</CardTitle>
          <CardDescription>
            You have not verified your email address yet
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
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
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </>
              )}
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/signup">
                Back to Sign Up
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
