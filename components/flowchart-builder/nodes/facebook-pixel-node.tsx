'use client'

import React from 'react'
import { Handle, Position } from 'reactflow'
import { Facebook } from 'lucide-react'

interface FacebookPixelNodeProps {
  data: {
    name?: string
    text?: string
    pixelId?: string
    accessToken?: string
    eventName?: string
    // Preset fields (not shown in UI but used in execution)
    url?: string
    method?: string
    headers?: any[]
    body?: string
  }
  selected?: boolean
}

export function FacebookPixelNode({ data, selected }: FacebookPixelNodeProps) {
  return (
    <div className={`
      group relative bg-white border-2 rounded-lg shadow-lg w-[250px] h-[120px] overflow-hidden
      ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-300'}
      hover:shadow-xl transition-all duration-200
    `}>
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all"
      />

      {/* Header */}
      <div className="bg-blue-100 text-blue-800 px-3 py-2 border-b border-blue-200">
        <div className="flex items-center space-x-2">
          <Facebook className="w-4 h-4" />
          <span className="font-medium text-sm truncate">Facebook Pixel</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1">
        <div className="h-full flex flex-col">
          <div className="font-medium text-gray-900 text-sm truncate" title={data.name || 'Facebook Pixel Event'}>
            {data.name || 'Facebook Pixel Event'}
          </div>

          {data.eventName && (
            <div className="text-xs text-gray-600 mt-1">
              <span className="font-mono bg-blue-50 px-1 py-0.5 rounded text-xs">
                {data.eventName}
              </span>
            </div>
          )}

          <div className="text-sm text-gray-700 mt-1 overflow-hidden leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={data.text}>
            {data.text || (data.pixelId ? `Pixel ID: ${data.pixelId}` : 'Configure Facebook Pixel')}
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