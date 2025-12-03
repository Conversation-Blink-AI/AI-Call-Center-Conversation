'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  BookOpen, 
  Rocket, 
  Workflow, 
  MessageSquare, 
  Phone, 
  Send, 
  Code, 
  Users, 
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface NavSection {
  title: string
  icon: any
  items: {
    title: string
    href: string
    badge?: string
  }[]
}

const navSections: NavSection[] = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start Guide', href: '/docs/quick-start' },
      { title: 'Create Your First Pathway', href: '/docs/first-pathway' },
    ]
  },
  {
    title: 'Flowchart Builder',
    icon: Workflow,
    items: [
      { title: 'Overview', href: '/docs/flowchart-builder' },
      { title: 'Node Types', href: '/docs/node-types' },
      { title: 'Creating Pathways', href: '/docs/creating-pathways' },
      { title: 'Editing & Saving', href: '/docs/editing-pathways' },
    ]
  },
  {
    title: 'Voice AI Agents',
    icon: MessageSquare,
    items: [
      { title: 'Voice Selection', href: '/docs/voice-selection' },
      { title: 'AI Generation', href: '/docs/ai-generation' },
      { title: 'Customizing Conversations', href: '/docs/customizing-conversations' },
    ]
  },
  {
    title: 'Phone Numbers',
    icon: Phone,
    items: [
      { title: 'Purchasing Numbers', href: '/docs/purchasing-numbers' },
      { title: 'Managing Numbers', href: '/docs/managing-numbers' },
      { title: 'Connecting to Pathways', href: '/docs/connecting-numbers' },
    ]
  },
  {
    title: 'Sending Calls',
    icon: Send,
    items: [
      { title: 'Making Outbound Calls', href: '/docs/sending-calls' },
      { title: 'Call Configuration', href: '/docs/call-configuration' },
    ]
  },
  {
    title: 'Integrations',
    icon: Code,
    items: [
      { title: 'Webhooks', href: '/docs/webhooks' },
      { title: 'API Reference', href: '/docs/api-reference' },
      { title: 'External Services', href: '/docs/external-services' },
    ]
  },
  {
    title: 'Team & Collaboration',
    icon: Users,
    items: [
      { title: 'Team Management', href: '/docs/team-management' },
      { title: 'Sharing Pathways', href: '/docs/sharing-pathways' },
    ]
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    items: [
      { title: 'Call History', href: '/docs/call-history' },
      { title: 'Performance Metrics', href: '/docs/analytics' },
    ]
  },
]

export function DocsSidebar() {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['Getting Started']) // Default to open "Getting Started"
  )

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  // Check if a section should be open based on current path
  const isSectionActive = (section: NavSection) => {
    return section.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
  }

  // Auto-open sections that contain the current page
  navSections.forEach((section) => {
    if (isSectionActive(section) && !openSections.has(section.title)) {
      setOpenSections((prev) => new Set(prev).add(section.title))
    }
  })

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-muted/30 h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <Link href="/docs" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Documentation</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navSections.map((section) => {
          const isOpen = openSections.has(section.title)
          const Icon = section.icon

          return (
            <Collapsible
              key={section.title}
              open={isOpen}
              onOpenChange={() => toggleSection(section.title)}
            >
              <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Icon className="h-4 w-4" />
                <span>{section.title}</span>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="ml-7 mt-1 space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </nav>
    </aside>
  )
}

