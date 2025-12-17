
'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  const [toolbarPosition, setToolbarPosition] = useState({ x: position.x + 255, y: position.y })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Update position when prop changes
  useEffect(() => {
    setToolbarPosition({ x: position.x + 255, y: position.y })
  }, [position.x, position.y])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (toolbarRef.current) {
        const parentRect = toolbarRef.current.offsetParent?.getBoundingClientRect() || 
                          document.body.getBoundingClientRect()
        const newX = e.clientX - parentRect.left - dragOffset.x
        const newY = e.clientY - parentRect.top - dragOffset.y
        setToolbarPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <div 
      ref={toolbarRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col"
      style={{
        left: toolbarPosition.x,
        top: toolbarPosition.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Drag Handle at Top */}
      <div
        onMouseDown={handleMouseDown}
        className="w-full h-6 cursor-grab active:cursor-grabbing flex items-center justify-center border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        title="Drag to move toolbar"
      >
        <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
      </div>

      {/* Buttons Container */}
      <div className="p-1 flex flex-col gap-1">
        {/* Edit Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-8 w-8 p-0 text-gray-800 hover:bg-blue-50 hover:text-blue-600"
          title="Edit Node"
        >
          <Pencil className="w-4 h-4" />
        </Button>

        {/* Delete Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-gray-800 hover:bg-red-50 hover:text-red-600"
          title="Delete Node"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {/* Duplicate Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDuplicate}
          className="h-8 w-8 p-0 text-gray-800 hover:bg-green-50 hover:text-green-600"
          title="Duplicate Node"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
