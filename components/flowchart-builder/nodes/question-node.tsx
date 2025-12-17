'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { HelpCircle, Pencil, Trash2 } from 'lucide-react'

interface QuestionNodeData {
  name: string
  text: string
}

export function QuestionNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className={`px-3 py-2 shadow-md rounded-md bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 w-[255px] h-[100px] transition-all duration-200 relative overflow-visible ${
        selected ? 'shadow-lg scale-105' : ''
      }`}
    >
      <div className="overflow-hidden h-full flex items-center">
        <div className="flex items-center space-x-1.5">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <div className="text-[14px] font-medium text-blue-800">{data.name || 'Question'}</div>
            <div
              className="text-[12px] opacity-80 text-blue-700 mt-0.5 leading-tight overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              title={data.text || 'Ask a question'}
            >
              {data.text || 'Ask a question'}
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
