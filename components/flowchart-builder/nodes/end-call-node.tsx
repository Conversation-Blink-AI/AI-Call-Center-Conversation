'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { PhoneOff, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast';

interface EndCallNodeData {
  prompt: string
}

export function EndCallNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-red-100 border-2 w-[250px] h-[120px] transition-all duration-200 relative overflow-hidden ${
      selected ? 'border-red-500 shadow-lg scale-105' : 'border-red-300 hover:border-red-400'
    }`}>

      <div className="flex items-center space-x-2">
        <PhoneOff className="w-4 h-4 text-red-600" />
        <div className="font-bold text-red-800">
          {data.name || 'End Call'}
        </div>
      </div>
      <div className="text-sm text-red-700 mt-2 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }} title={data.prompt || data.text || 'End conversation'}>
        {data.prompt || data.text || 'End conversation'}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all"
      />
    </div>
  )
}