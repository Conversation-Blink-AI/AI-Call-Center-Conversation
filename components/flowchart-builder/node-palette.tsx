'use client'

import React from 'react'
import { MessageCircle, HelpCircle, MessageSquare, PhoneOff, PhoneForwarded, Globe, Facebook } from 'lucide-react'

const nodeTypes = [
  {
    type: 'greetingNode',
    label: 'Greeting',
    icon: MessageCircle,
    color: 'bg-gradient-to-br from-green-100 via-green-50 to-green-100 text-green-800 border-green-300',
    description: 'Start conversation'
  },
  {
    type: 'questionNode',
    label: 'Question',
    icon: HelpCircle,
    color: 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 text-blue-800 border-blue-300',
    description: 'Ask a question'
  },
  {
    type: 'customerResponseNode',
    label: 'Customer Response',
    icon: MessageSquare,
    color: 'bg-gradient-to-br from-yellow-100 via-yellow-50 to-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Handle response'
  },
  {
    type: 'webhookNode',
    label: 'Webhook',
    icon: Globe,
    color: 'bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 text-orange-800 border-orange-300',
    description: 'API integration'
  },
  {
    type: 'facebookPixelNode',
    label: 'Facebook Pixel',
    icon: Facebook,
    color: 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 text-blue-800 border-blue-300',
    description: 'Track FB conversions'
  },
  {
    type: 'transferNode',
    label: 'Transfer',
    icon: PhoneForwarded,
    color: 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 text-purple-800 border-purple-300',
    description: 'Transfer call'
  },
  {
    type: 'endCallNode',
    label: 'End Call',
    icon: PhoneOff,
    color: 'bg-gradient-to-br from-red-100 via-red-50 to-red-100 text-red-800 border-red-300',
    description: 'End conversation'
  }
]

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-64 bg-card border-r border-border p-4 h-full overflow-y-auto">
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
  )
}