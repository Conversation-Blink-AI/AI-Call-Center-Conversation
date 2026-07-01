"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Home,
  BarChart3,
  BookOpen,
  Phone,
  CreditCard,
  History,
  ChevronUp,
  User,
  LogOut,
  Mic,
  HelpCircle,
  Workflow,
  Shield,
  Building2,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
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
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Pathway", href: "/dashboard/pathway", icon: Workflow },
  { name: "Knowledge Base", href: "/dashboard/knowledgebase", icon: BookOpen },
  { name: "Analytics", href: "/dashboard/calls", icon: BarChart3 },
  { name: "Send Call", href: "/dashboard/sendcall", icon: Phone },
  { name: "Voices", href: "/dashboard/voices", icon: Mic },
  { name: "Call History", href: "/dashboard/call-history", icon: History },
  { name: "Phone Numbers", href: "/dashboard/phone-numbers", icon: Phone },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Help", href: "/dashboard/help", icon: HelpCircle },
]

export function DashboardSidebar() {
  const [isMounted, setIsMounted] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isAdmin = Boolean(user?.is_admin)
  const organizationLinks = user
    ? [{ name: "My Organization", href: "/dashboard/organization", icon: Building2 }]
    : []
  const navLinks = isAdmin
    ? [...navigation.slice(0, 1), ...organizationLinks, ...navigation.slice(1), { name: "Admin", href: "/admin", icon: Shield }]
    : [...navigation.slice(0, 1), ...organizationLinks, ...navigation.slice(1)]

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false)
      await logout()
    } catch (error) {
      console.error("❌ [SIDEBAR] Logout error:", error)
      router.push("/")
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <aside
        className={cn(
          sidebarShellClass,
          "w-16 z-40 flex flex-col",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-border">
          <span className="text-xl font-bold text-foreground">C</span>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        "peer group",
        sidebarShellClass,
        sidebarTransitionClass,
        "w-16 hover:w-60",
        "z-40 flex flex-col",
      )}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-border px-2 group-hover:justify-start group-hover:px-4">
        <Link href="/dashboard" className="flex items-center min-w-0 cursor-pointer">
          <div className="flex-shrink-0">
            <img
              src="/ConvLogoG.png"
              alt="Conversation Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = "none"
                target.nextElementSibling?.classList.remove("hidden")
              }}
            />
            <div className="hidden h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
          </div>
          <div className="w-0 ml-0 overflow-hidden whitespace-nowrap font-bold text-xl text-foreground opacity-0 transition-all duration-200 delay-75 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
            <span>Conversation</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className={sidebarNavClass}>
        <nav className={sidebarNavListClass}>
          {navLinks.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname.startsWith(link.href + "/") || pathname === link.href

            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                className={cn(
                  "flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 group/item justify-center px-2.5 group-hover:justify-start group-hover:px-3",
                  isActive ? sidebarNavItemActiveClass : sidebarNavItemInactiveClass,
                )}
              >
                <link.icon
                  className={cn(
                    sidebarNavIconClass,
                    isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-accent-foreground",
                  )}
                />
                <span className="w-0 ml-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 delay-75 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">{link.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Profile */}
      <div className="relative shrink-0 border-t border-border bg-background h-16 group-hover:h-auto group-hover:p-4" ref={dropdownRef}>
        <div className="relative flex h-full w-full items-center justify-center group-hover:block group-hover:h-auto">
          <div className="flex h-full w-full items-center justify-center group-hover:hidden">
            <Button
              variant="ghost"
              className="flex h-full w-full items-center justify-center rounded-xl p-0 hover:bg-accent"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
                <AvatarFallback className="bg-blue-600 text-sm font-medium text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>

          <div className="hidden w-full group-hover:block">
            <Button
              variant="ghost"
              className="flex h-auto w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 hover:bg-accent focus:bg-accent"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
                <AvatarFallback className="bg-blue-600 text-sm font-medium text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <ChevronUp
                className={cn(
                  "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                  isDropdownOpen ? "rotate-180" : "",
                )}
              />
            </Button>
          </div>

          {isDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 z-[60] mb-2 rounded-md border border-border bg-popover shadow-lg">
              <div className="border-b border-border/50 px-4 py-3">
                <p className="text-sm font-medium text-popover-foreground">
                  {user?.name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center px-4 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile Settings
                </Link>
                <hr className="my-1 border-border/50" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
