"use client"

import type React from "react"
import { useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Prevent body scrolling when dashboard is mounted
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content area - offset by sidebar width */}
      <div className="flex-1 flex flex-col overflow-y-auto ml-16 peer-hover:ml-60 transition-all duration-150 ease-in-out min-h-0">{children}</div>
    </div>
  )
}
