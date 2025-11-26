'use client'

import React from 'react'
import { Handle, Position } from 'reactflow'
import { Globe } from 'lucide-react'

interface WebhookNodeProps {
  data: {
    name?: string
    text?: string
    url?: string
    method?: string
    body?: string
    extractVars?: any[]
    responseData?: any[]
    headers?: any[]
    authorization?: string
    timeout?: number
    retryAttempts?: number
    rerouteServer?: boolean
  }
  selected?: boolean
}

export function WebhookNode({ data, selected }: WebhookNodeProps) {
  return (
    <div className={`
      group relative bg-white border-2 rounded-lg shadow-lg w-[250px] h-[120px] overflow-hidden
      ${selected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-300'}
      hover:shadow-xl transition-all duration-200
    `}>
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all"
      />

      {/* Header */}
      <div className="bg-orange-100 text-orange-800 px-3 py-2 border-b border-orange-200">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4" />
          <span className="font-medium text-sm truncate">Webhook</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1">
        <div className="h-full flex flex-col">
          <div className="font-medium text-gray-900 text-sm truncate" title={data.name || 'Webhook Request'}>
            {data.name || 'Webhook Request'}
          </div>

          {data.method && data.url && (
            <div className="text-xs text-gray-600 mt-1">
              <span className="font-mono bg-orange-50 px-1 py-0.5 rounded text-xs">
                {data.method}
              </span>
            </div>
          )}

          <div className="text-sm text-gray-700 mt-1 overflow-hidden leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={data.text}>
            {data.text || (data.url ? `URL: ${data.url}` : 'Configure webhook')}
          </div>
        </div>
      </div>



      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all"
      />
    </div>
  )
}