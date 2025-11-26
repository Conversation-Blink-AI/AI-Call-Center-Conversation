'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { PhoneForwarded, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'; // Assuming sonner is used for toasts

interface TransferNodeData {
  text: string
  transferNumber?: string
}

export function TransferNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-purple-100 border-2 w-[250px] h-[120px] transition-all duration-200 relative overflow-hidden ${
      selected ? 'border-purple-500 shadow-lg scale-105' : 'border-purple-300 hover:border-purple-400'
    }`}>

      <div className="flex items-center space-x-2">
        <PhoneForwarded className="w-4 h-4 text-purple-600" />
        <div className="font-bold text-purple-800">
          {data.name || 'Transfer Call'}
        </div>
      </div>
      <div className="text-sm text-purple-700 mt-2 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }} title={data.transferNumber || '+1234567890'}>
        {data.transferNumber || '+1234567890'}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:w-5 hover:h-5 transition-all"
      />
      {/* No source handle - Transfer node is terminal */}
      
    </div>
  )
}