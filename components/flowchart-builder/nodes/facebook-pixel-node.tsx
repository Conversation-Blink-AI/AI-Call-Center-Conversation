'use client'

import React from 'react'
import { Handle, Position } from 'reactflow'
import { Facebook } from 'lucide-react'

interface FacebookPixelNodeProps {
  data: {
    name?: string
    text?: string
    eventName?: string
    configId?: string
    configNickname?: string
    testEventCode?: string
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
      group relative bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-800 dark:via-blue-700 dark:to-blue-800 rounded-lg shadow-lg w-[255px] h-[100px] overflow-visible
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
      <div className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 border-b border-blue-200 dark:border-blue-700 rounded-t-lg">
        <div className="flex items-center space-x-1">
          <Facebook className="w-5 h-5 flex-shrink-0" />
          <span className="text-[14px] font-medium">Facebook Pixel</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-1.5 flex-1">
        <div className="h-full flex flex-col">
          <div className="text-[14px] font-medium text-gray-900 dark:text-gray-100" title={data.name || 'Facebook Pixel Event'}>
            {data.name || 'Facebook Pixel Event'}
          </div>

          {data.eventName && (
            <div className="text-[12px] opacity-80 text-gray-600 dark:text-gray-300 mt-0.5">
              <span className="font-mono bg-blue-50 dark:bg-blue-900 px-0.5 py-0.5 rounded text-[7px]">{data.eventName}</span>
            </div>
          )}
          {data.testEventCode && (
            <div className="text-[11px] opacity-80 text-gray-600 dark:text-gray-300 mt-0.5">
              Test: {data.testEventCode}
            </div>
          )}

          <div
            className="text-[12px] opacity-80 text-gray-700 dark:text-gray-300 mt-0.5 overflow-hidden leading-tight"
            style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
            title={data.text}
          >
            {data.text || (data.configNickname ? `Config: ${data.configNickname}` : 'Select Meta CAPI config')}
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
