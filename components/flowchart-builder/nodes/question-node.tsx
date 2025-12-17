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
    <div className={`px-2 py-1.5 shadow-md rounded-md bg-blue-100 w-[140px] h-[55px] transition-all duration-200 relative overflow-hidden ${
      selected ? 'border-blue-500 shadow-lg scale-105' : 'border-blue-300 hover:border-blue-400'
    }`} style={{ border: '0.5px solid' }}>

      <div className="flex items-center space-x-1.5">
        <HelpCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
        <div>
          <div className="text-[8px] font-medium text-blue-800">{data.name || 'Question'}</div>
          <div className="text-[7px] opacity-80 text-blue-700 mt-0.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={data.text || 'Ask a question'}>
            {data.text || 'Ask a question'}
          </div>
        </div>
      </div>
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