"use client"

import type React from "react"
import { useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { WorkspaceBanner } from "@/components/dashboard/workspace-banner"
import { sidebarTransitionClass } from "@/lib/sidebar-layout"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Prevent body scrolling when dashboard is mounted
  useEffect(() => {
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <DashboardSidebar />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto ml-16 peer-hover:ml-60",
          sidebarTransitionClass,
        )}
      >
        <WorkspaceBanner />
        {children}
      </div>
    </div>
  )
}
