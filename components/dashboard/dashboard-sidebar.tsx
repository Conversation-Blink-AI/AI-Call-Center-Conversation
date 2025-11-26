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
  Phone,
  Users,
  CreditCard,
  Settings,
  FileText,
  History,
  ChevronUp,
  User,
  LogOut,
  Mic,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Pathway", href: "/dashboard/pathway", icon: FileText },
  { name: "Analytics", href: "/dashboard/calls", icon: BarChart3 },
  { name: "Send Call", href: "/dashboard/sendcall", icon: Phone },
  { name: "Voices", href: "/dashboard/voices", icon: Mic },
  { name: "Call History", href: "/dashboard/call-history", icon: History },
  { name: "Phone Numbers", href: "/dashboard/phone-numbers", icon: Phone },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
]

export function DashboardSidebar() {
  const [isMounted, setIsMounted] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      console.log("🚪 [SIDEBAR] Starting logout process...")
      setIsDropdownOpen(false)
      await logout()
      console.log("✅ [SIDEBAR] Logout successful")
      // Don't manually redirect - let the auth context handle it
    } catch (error) {
      console.error("❌ [SIDEBAR] Logout error:", error)
      // Fallback redirect only on error
      router.push("/")
    }
  }

  // Close dropdown when clicking outside
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
      <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-gray-50 border-r border-gray-200">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <span className="text-xl font-bold text-gray-900">B</span>
        </div>
      </aside>
    )
  }

  return (
    <aside className="peer group fixed left-0 top-0 z-40 h-screen w-16 hover:w-60 bg-background border-r border-border transition-all duration-300 ease-in-out overflow-hidden">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center min-w-0 cursor-pointer">
          <div className="flex-shrink-0">
            <img
              src="/ConvLogoG.png"
              alt="Conversation Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                // Fallback to a styled letter if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
          </div>
          <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 overflow-hidden whitespace-nowrap">
            <span className="text-xl font-bold text-foreground">Conversation</span>
          </div>
        </Link>
      </div>

      {/* Navigation - Takes up remaining space except for profile section */}
      <div className="flex-1 overflow-y-auto py-4" style={{ height: "calc(100vh - 64px - 80px)" }}>
        <nav className="space-y-1 px-2">
          {navigation.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname.startsWith(link.href + "/") || pathname === link.href

            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group/item",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                )}
              >
                <div className="flex-shrink-0">
                  <link.icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-accent-foreground",
                    )}
                  />
                </div>
                <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 overflow-hidden whitespace-nowrap">
                  <span>{link.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Profile Section - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4 bg-background" ref={dropdownRef}>
        <div className="relative">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-start gap-3 hover:bg-accent focus:bg-accent px-3 py-2.5 h-auto rounded-xl"
            onClick={() => {
              console.log("🖱️ Profile dropdown clicked, current state:", isDropdownOpen)
              setIsDropdownOpen(!isDropdownOpen)
            }}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
              <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden whitespace-nowrap min-w-0 flex-1 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <ChevronUp
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                isDropdownOpen ? "rotate-180" : "",
              )}
            />
          </Button>

          {/* Dropdown Menu - Opens upward with proper z-index */}
          {isDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-md shadow-lg z-[60]">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-border/50">
                <p className="text-sm font-medium text-popover-foreground">
                  {user?.name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile Settings
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Account Settings
                </Link>
                <hr className="my-1 border-border/50" />
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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