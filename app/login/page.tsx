"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login, loading: authLoading, isAuthenticated } = useAuth()

  // ✅ Simple redirect check - no complex logic
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log("🔄 [LOGIN-PAGE] User already authenticated")
      // Let the auth context handle the redirect
    }
  }, [isAuthenticated, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await login(email, password)
      if (!result.success) {
        setError(result.message)
        setIsLoading(false)
      }
      // ✅ Don't set loading to false on success - let the redirect happen
    } catch (err) {
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  // ✅ Show loading state while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000023]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#000023]">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Brand */}
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-purple-500 via-pink-600 to-blue-500 bg-clip-text text-transparent">
                Conversation
              </span>
            </h1>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Let's get you logged in
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 px-4 text-base bg-gray-800 border-gray-600 text-white rounded-lg focus:border-purple-500 focus:ring-purple-500 placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 px-4 pr-12 text-base bg-gray-800 border-gray-600 text-white rounded-lg focus:border-purple-500 focus:ring-purple-500 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-purple-400 focus:outline-none"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link href="/reset-password" className="text-sm text-purple-400 hover:text-purple-300">
                  Forgot password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link href="/signup" className="font-semibold text-purple-400 hover:text-purple-300">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Marketing Content */}
      <div className="flex-1 bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-white leading-tight">
              One smart move.
            </h2>
            <h3 className="text-5xl font-bold text-white leading-tight">
              One smart tool.
            </h3>
            <h4 className="text-5xl font-bold text-white leading-tight">
              Unlimited chill.
            </h4>
          </div>

          {/* Fun Emojis */}
          <div className="flex justify-center space-x-6">
            <div className="text-6xl">😎</div>
            <div className="text-6xl">🤖</div>
            <div className="text-6xl">🏖️</div>
          </div>

          {/* Additional Marketing Text */}
          <div className="text-lg text-gray-300 leading-relaxed">
            Transform your business calls with AI-powered pathways. 
            Build, deploy, and scale your phone automation with ease.
          </div>
        </div>
      </div>
    </div>
  )
}