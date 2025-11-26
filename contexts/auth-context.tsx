"use client"

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface User {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  company?: string | null
  phoneNumber?: string | null
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signup: (data: SignupData) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>
  refreshAuth: () => Promise<void>
  isAuthenticated: boolean
}

export interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
  company?: string
  phoneNumber?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false) // Explicitly manage isAuthenticated state
  const initializedRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()

  const checkAuth = async () => {
    console.log("🔄 [AUTH-CONTEXT] Checking authentication...")
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: 'no-cache' // Added to ensure fresh data
      })

      if (response.ok) {
        const data = await response.json()
        console.log("🔍 [AUTH-CONTEXT] Auth response data:", data)

        // Expect direct user object or nested user object with a 'value' property
        const userData = data.user?.value || data.user

        if (userData && typeof userData === 'object' && userData.id) {
          console.log("✅ [AUTH-CONTEXT] User authenticated:", userData.id, userData.email)
          setUser(userData)
          setIsAuthenticated(true) // Update isAuthenticated state
          setLoading(false)
          return
        }

        console.log("❌ [AUTH-CONTEXT] No valid user data in response", { userData, rawData: data })
        setUser(null)
        setIsAuthenticated(false) // Update isAuthenticated state
      } else {
        console.log("❌ [AUTH-CONTEXT] Auth check failed:", response.status)
        setUser(null)
        setIsAuthenticated(false) // Update isAuthenticated state
      }
    } catch (error: any) {
      console.error("❌ [AUTH-CONTEXT] Auth check error:", error.message)
      setUser(null)
      setIsAuthenticated(false) // Update isAuthenticated state
    } finally {
      setLoading(false)
    }
  }

  // Initialize auth context
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    console.log("🔄 [AUTH-CONTEXT] Initializing auth context...")

    checkAuth().finally(() => {
      setLoading(false)
      setIsInitialized(true)
    })

    return () => {
      initializedRef.current = false
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log("🔄 [AUTH-CONTEXT] Starting login for:", email)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!result.success) {
        console.error("❌ [AUTH-CONTEXT] Login error:", result.message)
        return { success: false, message: result.message }
      }

      console.log("✅ [AUTH-CONTEXT] Login successful")

      // Store external API token in localStorage for session management
      if (result.token || result.externalToken) {
        const tokenToStore = result.token || result.externalToken
        localStorage.setItem('auth-token', tokenToStore)
        console.log("✅ [AUTH-CONTEXT] Token stored in localStorage")
      }

      // Update user state and isAuthenticated
      setUser(result.user)
      setIsAuthenticated(true)

      // Redirect to dashboard
      router.push("/dashboard")

      return { success: true, message: result.message || "Login successful" }
    } catch (error: any) {
      console.error("❌ [AUTH-CONTEXT] Unexpected login error:", error)
      return { success: false, message: error.message || "An unexpected error occurred" }
    }
  }

  const signup = async (data: SignupData) => {
    try {
      console.log("🔄 [AUTH-CONTEXT] Starting signup for:", data.email)

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        console.error("❌ [AUTH-CONTEXT] Signup error:", result.message)
        return { success: false, message: result.message }
      }

      console.log("✅ [AUTH-CONTEXT] Signup successful")

      // Set user as authenticated and redirect to dashboard
      setUser(result.user)
      setIsAuthenticated(true)
      router.push("/dashboard")

      return { success: true, message: result.message || "Account created successfully" }
    } catch (error: any) {
      console.error("❌ [AUTH-CONTEXT] Unexpected signup error:", error)
      return { success: false, message: error.message || "An unexpected error occurred" }
    }
  }

  const logout = async () => {
    try {
      console.log("🚪 [AUTH-CONTEXT] Starting logout process...")
      
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      // Clear localStorage token
      localStorage.removeItem('auth-token')
      console.log("✅ [AUTH-CONTEXT] Token cleared from localStorage")

      setUser(null)
      setIsAuthenticated(false)
      
      console.log("✅ [AUTH-CONTEXT] Logout complete, redirecting to home page")
      // Small delay to ensure state is updated before redirect
      setTimeout(() => {
        router.push("/")
      }, 100)
    } catch (err) {
      console.error("❌ [AUTH-CONTEXT] Logout error:", err)
      
      // Clear localStorage token even on error
      localStorage.removeItem('auth-token')
      
      setUser(null)
      setIsAuthenticated(false)
      // Small delay to ensure state is updated before redirect
      setTimeout(() => {
        router.push("/")
      }, 100)
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (!user) {
        return { success: false, message: "Not logged in" }
      }

      console.log("🔄 [AUTH-CONTEXT] Updating profile for user:", user.id)

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        console.error("❌ [AUTH-CONTEXT] Profile update error:", result.message)
        return { success: false, message: result.message }
      }

      // Update local state
      setUser((prev) => (prev ? { ...prev, ...data } : null))
      // isAuthenticated state remains true if user was already logged in

      console.log("✅ [AUTH-CONTEXT] Profile updated successfully")
      return { success: true, message: "Profile updated successfully" }
    } catch (error: any) {
      console.error("❌ [AUTH-CONTEXT] Unexpected profile update error:", error)
      return { success: false, message: error.message || "An unexpected error occurred" }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      console.log("🔄 [AUTH-CONTEXT] Starting password reset for:", email)

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!result.success) {
        console.error("❌ [AUTH-CONTEXT] Password reset error:", result.message)
        return { success: false, message: result.message }
      }

      console.log("✅ [AUTH-CONTEXT] Password reset email sent successfully")
      return { success: true, message: result.message || "Password reset instructions sent to your email" }
    } catch (error: any) {
      console.error("❌ [AUTH-CONTEXT] Unexpected password reset error:", error)
      return { success: false, message: error.message || "An unexpected error occurred" }
    }
  }

  const refreshAuth = async () => {
    console.log("🔄 [AUTH-CONTEXT] Manually refreshing auth state...")
    await checkAuth()
  }

  // Prevent hydration mismatch by waiting for initialization
  if (!isInitialized && loading) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateProfile,
        resetPassword,
        refreshAuth,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}