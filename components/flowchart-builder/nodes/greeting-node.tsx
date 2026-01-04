'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { MessageCircle, Pencil, Trash2 } from 'lucide-react'

interface GreetingNodeData {
  text: string
}

export function GreetingNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`px-3 py-2 shadow-md rounded-md bg-gradient-to-br from-green-100 via-green-50 to-green-100 dark:from-green-800 dark:via-green-700 dark:to-green-800 w-[255px] h-[100px] transition-all duration-200 relative overflow-visible ${
      selected ? 'shadow-lg scale-105' : ''
    }`}>
      <div className="overflow-hidden h-full flex items-center">
        <div className="flex items-center space-x-1.5">
          <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-300 flex-shrink-0" />
          <div>
            <div className="text-[14px] font-medium text-green-800 dark:text-green-100">{data.name || 'Greeting'}</div>
            <div
              className="text-[12px] opacity-80 text-green-700 dark:text-green-200 mt-0.5 leading-tight overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              title={data.text || 'Welcome message'}
            >
              {data.text || 'Welcome message'}
            </div>
          </div>
        </div>
      </div>
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
