'use client'

import React, { useState } from 'react'
import { MessageCircle, HelpCircle, MessageSquare, PhoneOff, PhoneForwarded, Globe, Facebook, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const nodeTypes = [
  {
    type: 'greetingNode',
    label: 'Greeting',
    icon: MessageCircle,
    color: 'bg-gradient-to-br from-green-100 via-green-50 to-green-100 dark:from-green-800 dark:via-green-700 dark:to-green-800 text-green-800 dark:text-green-100 border-green-300 dark:border-green-700',
    description: 'Start conversation'
  },
  {
    type: 'questionNode',
    label: 'Question',
    icon: HelpCircle,
    color: 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 dark:from-blue-800 dark:via-blue-700 dark:to-blue-800 text-blue-800 dark:text-blue-100 border-blue-300 dark:border-blue-700',
    description: 'Ask a question'
  },
  {
    type: 'customerResponseNode',
    label: 'Customer Response',
    icon: MessageSquare,
    color: 'bg-gradient-to-br from-yellow-100 via-yellow-50 to-yellow-100 dark:from-yellow-800 dark:via-yellow-700 dark:to-yellow-800 text-yellow-800 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700',
    description: 'Handle response'
  },
  {
    type: 'webhookNode',
    label: 'Webhook',
    icon: Globe,
    color: 'bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 dark:from-orange-800 dark:via-orange-700 dark:to-orange-800 text-orange-800 dark:text-orange-100 border-orange-300 dark:border-orange-700',
    description: 'API integration'
  },
  {
    type: 'knowledgeBaseNode',
    label: 'Knowledge Base',
    icon: BookOpen,
    color: 'bg-gradient-to-br from-indigo-100 via-indigo-50 to-indigo-100 dark:from-indigo-800 dark:via-indigo-700 dark:to-indigo-800 text-indigo-800 dark:text-indigo-100 border-indigo-300 dark:border-indigo-700',
    description: 'Attach KB context'
  },
  {
    type: 'facebookPixelNode',
    label: 'Facebook Pixel',
    icon: Facebook,
    color: 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 dark:from-blue-800 dark:via-blue-700 dark:to-blue-800 text-blue-800 dark:text-blue-100 border-blue-300 dark:border-blue-700',
    description: 'Track FB conversions'
  },
  {
    type: 'transferNode',
    label: 'Transfer',
    icon: PhoneForwarded,
    color: 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-800 dark:via-purple-700 dark:to-purple-800 text-purple-800 dark:text-purple-100 border-purple-300 dark:border-purple-700',
    description: 'Transfer call'
  },
  {
    type: 'endCallNode',
    label: 'End Call',
    icon: PhoneOff,
    color: 'bg-gradient-to-br from-red-100 via-red-50 to-red-100 dark:from-red-800 dark:via-red-700 dark:to-red-800 text-red-800 dark:text-red-100 border-red-300 dark:border-red-700',
    description: 'End conversation'
  }
]

interface NodePaletteProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export function NodePalette({ isCollapsed = false, onToggle }: NodePaletteProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  
  // Use prop if provided, otherwise use internal state
  const collapsed = onToggle ? isCollapsed : internalCollapsed
  const toggleCollapse = onToggle || (() => setInternalCollapsed(!internalCollapsed))

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div 
      className={`bg-card dark:bg-[hsl(235,25%,10%)] border-r border-border h-full overflow-hidden transition-all duration-300 ease-in-out relative ${
        collapsed ? 'w-12' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleCollapse}
        className="absolute top-2 right-2 z-10 h-8 w-8 p-0 hover:bg-accent"
        title={collapsed ? 'Expand Node Palette' : 'Collapse Node Palette'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Content */}
      <div className={`h-full overflow-y-auto transition-opacity duration-300 ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 p-4'}`}>
        <h3 className="text-lg font-semibold text-foreground mb-4">Node Palette</h3>
        <div className="space-y-3">
          {nodeTypes.map((node) => {
            const IconComponent = node.icon
            return (
              <div
                key={node.type}
                className={`h-[80px] rounded-lg border-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 flex items-center ${node.color}`}
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
              >
                <div className="flex items-center space-x-2 px-3 w-full">
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{node.label}</div>
                    <div className="text-xs opacity-80 mt-0.5">{node.description}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Collapsed View - Show only icons */}
      {collapsed && (
        <div className="flex flex-col items-center py-4 space-y-2 h-full overflow-y-auto">
          {nodeTypes.map((node) => {
            const IconComponent = node.icon
            return (
              <div
                key={node.type}
                className="w-10 h-10 rounded-lg border-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 flex items-center justify-center bg-card border-border hover:bg-accent"
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
                title={node.label}
              >
                <IconComponent className="w-5 h-5 text-foreground" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}