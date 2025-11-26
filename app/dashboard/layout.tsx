"use client"

import type React from "react"

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content area - offset by sidebar width */}
      <div className="flex-1 flex flex-col overflow-y-auto ml-16 peer-hover:ml-60 transition-all duration-300 ease-in-out">{children}</div>
    </div>
  )
}
