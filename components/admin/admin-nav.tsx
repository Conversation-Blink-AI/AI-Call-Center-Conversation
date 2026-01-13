"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Phone,
  Wallet,
  PhoneCall,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Numbers", href: "/admin/numbers", icon: Phone },
  { name: "Wallets", href: "/admin/wallets", icon: Wallet },
  { name: "Call Logs", href: "/admin/call-logs", icon: PhoneCall },
]

export function AdminNav() {
  const [isExpanded, setIsExpanded] = useState(true)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "peer group fixed left-0 top-0 z-50 h-screen bg-background border-r border-border transition-all duration-300 ease-in-out shadow-sm",
        isExpanded ? "w-64" : "w-16 hover:w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4 relative">
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg whitespace-nowrap">Admin</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Shield className="h-6 w-6 text-primary mx-auto group-hover:opacity-0 transition-opacity duration-300" />
              <div className="absolute left-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg whitespace-nowrap">Admin</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href))
            
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all duration-300",
                    isExpanded ? "px-4" : "px-2 group-hover:px-4",
                    isActive && "bg-secondary"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-all duration-300",
                    isExpanded ? "mr-3" : "mr-0 group-hover:mr-3 mx-auto group-hover:mx-0"
                  )} />
                  <span className={cn(
                    "transition-all duration-300 whitespace-nowrap",
                    isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden"
                  )}>
                    {item.name}
                  </span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start transition-all duration-300" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-300 whitespace-nowrap",
                isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden"
              )}>
                Back to Dashboard
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  )
}
