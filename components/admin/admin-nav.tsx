"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Mic,
  Phone,
  Wallet,
  PhoneCall,
  Shield,
  ChevronLeft,
} from "lucide-react"
import {
  sidebarNavClass,
  sidebarNavIconClass,
  sidebarNavItemActiveClass,
  sidebarNavItemInactiveClass,
  sidebarNavListClass,
  sidebarShellClass,
  sidebarTransitionClass,
} from "@/lib/sidebar-layout"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Voices", href: "/admin/voices", icon: Mic },
  { name: "Numbers", href: "/admin/numbers", icon: Phone },
  { name: "Wallets", href: "/admin/wallets", icon: Wallet },
  { name: "Call Logs", href: "/admin/call-logs", icon: PhoneCall },
]

const navLabelClass =
  "w-0 ml-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 delay-75 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100"

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "peer group",
        sidebarShellClass,
        sidebarTransitionClass,
        "w-16 hover:w-60",
        "z-50 flex flex-col shadow-sm",
      )}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-border px-2 group-hover:justify-start group-hover:px-4">
        <div className="flex min-w-0 items-center">
          <Shield className={cn(sidebarNavIconClass, "text-primary")} />
          <span className={cn(navLabelClass, "text-lg font-semibold text-foreground")}>Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <div className={sidebarNavClass}>
        <nav className={sidebarNavListClass}>
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 group/item justify-center px-2.5 group-hover:justify-start group-hover:px-3",
                  isActive ? sidebarNavItemActiveClass : sidebarNavItemInactiveClass,
                )}
              >
                <item.icon
                  className={cn(
                    sidebarNavIconClass,
                    isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-accent-foreground",
                  )}
                />
                <span className={navLabelClass}>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-center border-t border-border bg-background h-16 group-hover:block group-hover:h-auto group-hover:p-4">
        <Link href="/dashboard" className="w-full">
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full justify-center rounded-xl px-2.5 group-hover:justify-start group-hover:px-3"
          >
            <ChevronLeft className={sidebarNavIconClass} />
            <span className={navLabelClass}>Back to Dashboard</span>
          </Button>
        </Link>
      </div>
    </aside>
  )
}
