'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'

interface CustomerResponseNodeData {
  name: string
  text: string
}

export function CustomerResponseNode({ data, selected }: { data: any; selected?: boolean }) {
  // Determine which content to display: text takes priority, then prompt, then default
  const displayText = (data.text && data.text.trim() !== '') 
    ? data.text 
    : (data.prompt && data.prompt.trim() !== '') 
      ? data.prompt 
      : 'Handle customer input';

  return (
    <div className={`px-3 py-2 shadow-md rounded-md bg-gradient-to-br from-yellow-100 via-yellow-50 to-yellow-100 dark:from-yellow-800 dark:via-yellow-700 dark:to-yellow-800 w-[255px] h-[100px] transition-all duration-200 relative overflow-visible ${
      selected ? 'shadow-lg scale-105' : ''
    }`}>

      <div className="overflow-hidden h-full flex items-center">
        <div className="flex items-center space-x-1.5">
          <MessageSquare className="w-5 h-5 text-yellow-600 dark:text-yellow-300 flex-shrink-0" />
          <div>
            <div className="text-[14px] font-medium text-yellow-800 dark:text-yellow-100">{data.name || 'Customer Response'}</div>
            <div
              className="text-[12px] opacity-80 text-yellow-700 dark:text-yellow-200 mt-0.5 leading-tight overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              title={displayText}
            >
              {displayText}
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
