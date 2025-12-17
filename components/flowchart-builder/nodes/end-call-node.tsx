'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { PhoneOff, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface EndCallNodeData {
  prompt: string
}

export function EndCallNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`px-3 py-2 shadow-md rounded-md bg-red-100 w-[190px] h-[80px] transition-all duration-200 relative overflow-visible ${
      selected ? 'shadow-lg scale-105' : ''
    }`}>

      <div className="overflow-hidden h-full">
        <div className="flex items-center space-x-1.5">
          <PhoneOff className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
          <div>
            <div className="text-[14px] font-medium text-red-800">{data.name || 'End Call'}</div>
            <div
              className="text-[12px] opacity-80 text-red-700 mt-0.5 leading-tight overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              title={data.prompt || data.text || 'End conversation'}
            >
              {data.prompt || data.text || 'End conversation'}
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
          width: '12px',
          height: '12px',
          transformOrigin: '50% 50%',
        }}
      />
    </div>
  )
}
