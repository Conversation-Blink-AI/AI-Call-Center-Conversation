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
      group relative bg-white rounded-lg shadow-lg w-[140px] h-[55px] overflow-hidden
      ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-300'}
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
      <div className="bg-blue-100 text-blue-800 px-1.5 py-0.5 border-b border-blue-200">
        <div className="flex items-center space-x-1">
          <Facebook className="w-3 h-3 flex-shrink-0" />
          <span className="text-[8px] font-medium">Facebook Pixel</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-1.5 flex-1">
        <div className="h-full flex flex-col">
          <div className="text-[8px] font-medium text-gray-900" title={data.name || 'Facebook Pixel Event'}>
            {data.name || 'Facebook Pixel Event'}
          </div>

          {data.eventName && (
            <div className="text-[7px] opacity-80 text-gray-600 mt-0.5">
              <span className="font-mono bg-blue-50 px-0.5 py-0.5 rounded text-[6px]">
                {data.eventName}
              </span>
            </div>
          )}

          <div className="text-[7px] opacity-80 text-gray-700 mt-0.5 overflow-hidden leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }} title={data.text}>
            {data.text || (data.pixelId ? `Pixel ID: ${data.pixelId}` : 'Configure Facebook Pixel')}
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