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
    <div className={`px-4 py-3 shadow-md rounded-md bg-yellow-100 border-2 w-[250px] h-[120px] transition-all duration-200 relative overflow-hidden ${
      selected ? 'border-yellow-500 shadow-lg scale-105' : 'border-yellow-300 hover:border-yellow-400'
    }`}>

      <div className="flex items-center space-x-2">
        <MessageSquare className="w-4 h-4 text-yellow-600" />
        <div className="font-bold text-yellow-800">
          {data.name || 'Customer Response'}
        </div>
      </div>
      <div className="text-sm text-yellow-700 mt-2 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }} title={data.text || 'Handle customer input'}>
        {data.text || 'Handle customer input'}
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