'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { MessageCircle, Pencil, Trash2 } from 'lucide-react'

interface GreetingNodeData {
  text: string
}

export function GreetingNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`px-2 py-1.5 shadow-md rounded-md bg-green-100 w-[140px] h-[55px] transition-all duration-200 relative overflow-visible ${
      selected ? 'shadow-lg scale-105' : ''
    }`}>
      <div className="overflow-hidden h-full">
        <div className="flex items-center space-x-1.5">
          <MessageCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
          <div>
            <div className="text-[8px] font-medium text-green-800">{data.name || 'Greeting'}</div>
            <div className="text-[7px] opacity-80 text-green-700 mt-0.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={data.text || 'Welcome message'}>
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
          width: '8px',
          height: '8px',
          transformOrigin: '50% 50%',
        }}
      />
    </div>
  )
}