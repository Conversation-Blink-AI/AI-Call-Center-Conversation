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
    <div className={`px-4 py-3 shadow-md rounded-md bg-blue-100 border-2 w-[250px] h-[120px] transition-all duration-200 relative overflow-hidden ${
      selected ? 'border-blue-500 shadow-lg scale-105' : 'border-blue-300 hover:border-blue-400'
    }`}>

      <div className="flex items-center space-x-2">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <div className="font-bold text-blue-800">
          {data.name || 'Question'}
        </div>
      </div>
      <div className="text-sm text-blue-700 mt-2 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }} title={data.text || 'Ask a question'}>
        {data.text || 'Ask a question'}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all"
      />
    </div>
  )
}