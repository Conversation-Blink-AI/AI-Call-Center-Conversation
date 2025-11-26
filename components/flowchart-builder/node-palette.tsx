'use client'

import React from 'react'
import { MessageCircle, HelpCircle, MessageSquare, PhoneOff, PhoneForwarded, Globe, Facebook } from 'lucide-react'

const nodeTypes = [
  {
    type: 'greetingNode',
    label: 'Greeting',
    icon: MessageCircle,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Start conversation'
  },
  {
    type: 'questionNode',
    label: 'Question',
    icon: HelpCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Ask a question'
  },
  {
    type: 'customerResponseNode',
    label: 'Customer Response',
    icon: MessageSquare,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Handle response'
  },
  {
    type: 'webhookNode',
    label: 'Webhook',
    icon: Globe,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'API integration'
  },
  {
    type: 'facebookPixelNode',
    label: 'Facebook Pixel',
    icon: Facebook,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Track FB conversions'
  },
  {
    type: 'transferNode',
    label: 'Transfer',
    icon: PhoneForwarded,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Transfer call'
  },
  {
    type: 'endCallNode',
    label: 'End Call',
    icon: PhoneOff,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'End conversation'
  }
]

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 h-full overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Palette</h3>
      <div className="space-y-3">
        {nodeTypes.map((node) => {
          const IconComponent = node.icon
          return (
            <div
              key={node.type}
              className={`p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${node.color}`}
              draggable
              onDragStart={(event) => onDragStart(event, node.type)}
            >
              <div className="flex items-center space-x-2">
                <IconComponent className="w-5 h-5" />
                <div>
                  <div className="font-medium">{node.label}</div>
                  <div className="text-xs opacity-80">{node.description}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}