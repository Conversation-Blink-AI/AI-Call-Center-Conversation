'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function DocsHeader() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and Navigation links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/ConvLogoG.png"
                alt="Conversation Logo"
                className="h-6 w-6 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="font-bold text-lg">Conversation</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/docs"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === '/docs' || pathname.startsWith('/docs/')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                Documentation
              </Link>
              <Link
                href="/docs/api-reference"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === '/docs/api-reference'
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                API Reference
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Dashboard →
              </Link>
            </nav>
          </div>

          {/* Center - Search Bar */}
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                className="pl-10 w-full"
              />
              {isSearchOpen && searchQuery && (
                <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-md shadow-lg p-2 z-50">
                  <div className="text-sm text-muted-foreground p-2">
                    Search results will appear here...
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right side - Theme toggle and mobile menu */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Link href="/">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

