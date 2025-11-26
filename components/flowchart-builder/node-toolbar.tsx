
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Copy } from 'lucide-react'

interface NodeToolbarProps {
  nodeId: string
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  position: { x: number; y: number }
}

export function NodeToolbar({ nodeId, onEdit, onDelete, onDuplicate, position }: NodeToolbarProps) {
  return (
    <div 
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex flex-col gap-1"
      style={{
        left: position.x + 260, // Position to the right of the node (node width + 10px margin)
        top: position.y,
      }}
    >
      {/* Edit Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onEdit}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
        title="Edit Node"
      >
        <Pencil className="w-4 h-4" />
      </Button>

      {/* Delete Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
        title="Delete Node"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* Duplicate Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onDuplicate}
        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
        title="Duplicate Node"
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  )
}
