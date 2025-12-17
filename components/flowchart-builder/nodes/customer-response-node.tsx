'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'

interface CustomerResponseNodeData {
  name: string
  text: string
}

export function CustomerResponseNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`px-2 py-1.5 shadow-md rounded-md bg-yellow-100 w-[140px] h-[55px] transition-all duration-200 relative overflow-visible ${
      selected ? 'border-yellow-600 shadow-lg scale-105' : 'border-yellow-500 hover:border-yellow-600'
    }`} style={{ border: '0.5px solid' }}>

      <div className="overflow-hidden h-full">
        <div className="flex items-center space-x-1.5">
          <MessageSquare className="w-3 h-3 text-yellow-600 flex-shrink-0" />
          <div>
            <div className="text-[8px] font-medium text-yellow-800">{data.name || 'Customer Response'}</div>
            <div className="text-[7px] opacity-80 text-yellow-700 mt-0.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={data.text || 'Handle customer input'}>
              {data.text || 'Handle customer input'}
            </div>
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="transition-all z-[9999] rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '6px',
          height: '6px',
          transformOrigin: '50% 50%',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="transition-all z-[9999] rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '6px',
          height: '6px',
          transformOrigin: '50% 50%',
        }}
      />
    </div>
  )
}