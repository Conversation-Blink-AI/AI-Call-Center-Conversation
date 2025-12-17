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
    url?: string
    method?: string
    headers?: any[]
    body?: string
  }
  selected?: boolean
}

export function FacebookPixelNode({ data, selected }: FacebookPixelNodeProps) {
  return (
    <div
      className={`
      group relative bg-white rounded-lg shadow-lg w-[190px] h-[85px] overflow-visible
      hover:shadow-xl transition-all duration-200
    `}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="transition-all z-[9999] rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '12px',
          height: '12px',
          transformOrigin: '50% 50%',
        }}
      />

      {/* Header */}
      <div className="bg-blue-100 text-blue-800 px-1.5 py-0.5 border-b border-blue-200 rounded-t-lg">
        <div className="flex items-center space-x-1">
          <Facebook className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[14px] font-medium">Facebook Pixel</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-1.5 flex-1">
        <div className="h-full flex flex-col">
          <div className="text-[14px] font-medium text-gray-900" title={data.name || 'Facebook Pixel Event'}>
            {data.name || 'Facebook Pixel Event'}
          </div>

          {data.eventName && (
            <div className="text-[12px] opacity-80 text-gray-600 mt-0.5">
              <span className="font-mono bg-blue-50 px-0.5 py-0.5 rounded text-[7px]">{data.eventName}</span>
            </div>
          )}

          <div
            className="text-[12px] opacity-80 text-gray-700 mt-0.5 overflow-hidden leading-tight"
            style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
            title={data.text}
          >
            {data.text || (data.pixelId ? `Pixel ID: ${data.pixelId}` : 'Configure Facebook Pixel')}
          </div>
        </div>
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="transition-all z-[9999] rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '12px',
          height: '12px',
          transformOrigin: '50% 50%',
          marginTop: '6px',
        }}
      />
    </div>
  )
}
