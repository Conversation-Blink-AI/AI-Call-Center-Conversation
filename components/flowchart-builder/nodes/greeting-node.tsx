'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { MessageCircle, Pencil, Trash2 } from 'lucide-react'

interface GreetingNodeData {
  text: string
}

export function GreetingNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-green-100 border-2 w-[250px] h-[120px] transition-all duration-200 relative overflow-hidden ${
      selected ? 'border-green-500 shadow-lg scale-105' : 'border-green-300 hover:border-green-400'
    }`}>
      
      <div className="flex items-center space-x-2">
        <MessageCircle className="w-4 h-4 text-green-600" />
        <div className="font-bold text-green-800">
          {data.name || 'Greeting'}
        </div>
      </div>
      <div className="text-sm text-green-700 mt-2 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }} title={data.text || 'Welcome message'}>
        {data.text || 'Welcome message'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all" />
    </div>
  )
}