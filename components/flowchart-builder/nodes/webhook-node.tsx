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
      group relative bg-white rounded-lg shadow-lg w-[140px] h-[55px] overflow-hidden
      ${selected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-300'}
      hover:shadow-xl transition-all duration-200
    `} style={{ border: '0.5px solid' }}>
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="transition-all z-20 rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '8px',
          height: '8px',
        }}
      />

      {/* Header */}
      <div className="bg-orange-100 text-orange-800 px-1.5 py-0.5 border-b border-orange-200">
        <div className="flex items-center space-x-1">
          <Globe className="w-3 h-3 flex-shrink-0" />
          <span className="text-[8px] font-medium">Webhook</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-1.5 flex-1">
        <div className="h-full flex flex-col">
          <div className="text-[8px] font-medium text-gray-900" title={data.name || 'Webhook Request'}>
            {data.name || 'Webhook Request'}
          </div>

          {data.method && data.url && (
            <div className="text-[7px] opacity-80 text-gray-600 mt-0.5">
              <span className="font-mono bg-orange-50 px-0.5 py-0.5 rounded text-[6px]">
                {data.method}
              </span>
            </div>
          )}

          <div className="text-[7px] opacity-80 text-gray-700 mt-0.5 overflow-hidden leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }} title={data.text}>
            {data.text || (data.url ? `URL: ${data.url}` : 'Configure webhook')}
          </div>
        </div>
      </div>



      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="transition-all z-20 rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '8px',
          height: '8px',
        }}
      />
    </div>
  )
}