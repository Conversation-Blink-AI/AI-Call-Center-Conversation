"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { useAuth } from "@/contexts/auth-context"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      if (!user) {
        router.push("/")
        return
      }

      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          const userData = data.user?.value || data.user

          // Check is_admin flag
          if (!userData?.is_admin) {
            router.push("/dashboard")
            return
          }
        } else {
          router.push("/")
          return
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
        router.push("/")
        return
      } finally {
        setIsChecking(false)
      }
    }

    checkAdmin()
  }, [user, router])

  // Prevent body scrolling
  useEffect(() => {
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
    }
  }, [])

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <AdminNav />
      <div className="flex-1 flex flex-col overflow-y-auto ml-16 peer-hover:ml-64 transition-all duration-300 ease-in-out min-h-0">
        {children}
      </div>
    </div>
  )
}
