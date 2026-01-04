
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Copy } from 'lucide-react'
import type { ReactFlowInstance } from 'reactflow'

interface NodeToolbarProps {
  nodeId: string
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  position: { x: number; y: number } // Flow coordinates
  reactFlowInstance: ReactFlowInstance | null
  nodeWidth?: number // Approximate node width for positioning
  wrapperRef?: React.RefObject<HTMLDivElement> // Reference to the wrapper container
}

export function NodeToolbar({ 
  nodeId, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  position,
  reactFlowInstance,
  nodeWidth = 200,
  wrapperRef
}: NodeToolbarProps) {
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)
  const relativeOffsetRef = useRef({ x: 12, y: 0 }) // Offset from node (12px margin between node and toolbar)
  const justFinishedDraggingRef = useRef(false) // Flag to prevent immediate position override after drag
  
  // Try to find the actual node element in the DOM to get its real position
  const getNodeElement = useCallback((): HTMLElement | null => {
    if (!reactFlowInstance) return null
    // ReactFlow nodes are rendered with data-id attribute
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement
    // Also try finding by react-flow__node class and checking the node data
    if (!nodeElement) {
      const allNodes = document.querySelectorAll('.react-flow__node')
      for (const node of allNodes) {
        const nodeData = (node as HTMLElement).getAttribute('data-id')
        if (nodeData === nodeId) {
          return node as HTMLElement
        }
      }
    }
    return nodeElement
  }, [reactFlowInstance, nodeId])

  // Convert flow coordinates to screen coordinates and update toolbar position
  const updateToolbarPosition = useCallback(() => {
    if (!reactFlowInstance) return

    // Get the wrapper element (the container that holds the toolbar)
    const wrapper = wrapperRef?.current
    if (!wrapper) return

    // Try to get the actual rendered node element for more accurate positioning
    const nodeElement = getNodeElement()
    
    // Convert node's flow position to screen coordinates (relative to ReactFlow pane)
    const screenPosition = reactFlowInstance.flowToScreenPosition({
      x: position.x,
      y: position.y
    })

    // Get the pane element to find its position within the wrapper
    const pane = document.querySelector('.react-flow__pane') as HTMLElement
    if (!pane) return

    // If we found the actual node element, use its position for more accuracy
    if (nodeElement) {
      const wrapperRect = wrapper.getBoundingClientRect()
      const nodeRect = nodeElement.getBoundingClientRect()
      
      // Calculate position relative to wrapper
      const nodeX = nodeRect.left - wrapperRect.left
      const nodeY = nodeRect.top - wrapperRect.top
      
      // Position toolbar to the right of the node
      setToolbarPosition({
        x: nodeX + nodeRect.width + relativeOffsetRef.current.x,
        y: nodeY + relativeOffsetRef.current.y
      })
    } else {
      // Fallback: use calculated screen position
      const wrapperRect = wrapper.getBoundingClientRect()
      const paneRect = pane.getBoundingClientRect()
      
      // Calculate pane's offset within the wrapper
      const paneOffsetX = paneRect.left - wrapperRect.left
      const paneOffsetY = paneRect.top - wrapperRect.top
      
      // Position toolbar next to the node
      setToolbarPosition({
        x: paneOffsetX + screenPosition.x + nodeWidth + relativeOffsetRef.current.x,
        y: paneOffsetY + screenPosition.y + relativeOffsetRef.current.y
      })
    }
  }, [reactFlowInstance, position.x, position.y, nodeWidth, wrapperRef, getNodeElement])

  // Update position when node position or viewport changes
  useEffect(() => {
    if (!reactFlowInstance) return
    
    // Don't update automatically when dragging - let the drag handler control position
    // Also don't update immediately after drag ends to preserve the dragged position
    if (isDragging || justFinishedDraggingRef.current) return

    // Use requestAnimationFrame for smooth updates during node dragging and pan/zoom
    // Always update on every frame to ensure perfect alignment during zoom
    let animationFrameId: number
    let isRunning = true

    const updatePosition = () => {
      if (!isRunning || !reactFlowInstance || isDragging) return
      
      // Always update position - this ensures smooth tracking during zoom
      updateToolbarPosition()
      
      animationFrameId = requestAnimationFrame(updatePosition)
    }

    // Initial update
    updateToolbarPosition()
    
    // Start continuous updates - update on every frame for smooth zoom tracking
    animationFrameId = requestAnimationFrame(updatePosition)

    return () => {
      isRunning = false
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [updateToolbarPosition, reactFlowInstance, isDragging])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (toolbarRef.current && reactFlowInstance) {
      e.preventDefault()
      e.stopPropagation()
      
      // Get the wrapper element for coordinate calculation
      const wrapper = wrapperRef?.current
      if (!wrapper) return
      
      const wrapperRect = wrapper.getBoundingClientRect()
      const toolbarRect = toolbarRef.current.getBoundingClientRect()
      
      // Calculate the offset from mouse click position to toolbar's top-left corner
      // This is relative to the wrapper
      const toolbarX = toolbarRect.left - wrapperRect.left
      const toolbarY = toolbarRect.top - wrapperRect.top
      const mouseX = e.clientX - wrapperRect.left
      const mouseY = e.clientY - wrapperRect.top
      
      // Offset is the distance from mouse click to toolbar's top-left
      setDragOffset({ 
        x: mouseX - toolbarX, 
        y: mouseY - toolbarY 
      })
      setIsDragging(true)
    }
  }

  useEffect(() => {
    if (!isDragging || !reactFlowInstance) return

    const handleMouseMove = (e: MouseEvent) => {
      if (toolbarRef.current) {
        // Get the wrapper element
        const wrapper = wrapperRef?.current
        if (!wrapper) return

        const wrapperRect = wrapper.getBoundingClientRect()
        
        // Calculate mouse position relative to wrapper
        const mouseX = e.clientX - wrapperRect.left
        const mouseY = e.clientY - wrapperRect.top
        
        // Calculate new toolbar position (mouse position minus the drag offset)
        // This makes the toolbar follow the mouse cursor exactly
        const newX = mouseX - dragOffset.x
        const newY = mouseY - dragOffset.y
        
        // Update toolbar position directly during drag
        setToolbarPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!reactFlowInstance || !toolbarRef.current) {
        setIsDragging(false)
        return
      }
      
      // Get the final toolbar position from the current state
      // Use a callback to get the latest state value
      setToolbarPosition((currentPos) => {
        // When drag ends, update the relative offset so toolbar maintains position relative to node
        const wrapper = wrapperRef?.current
        if (!wrapper) {
          setIsDragging(false)
          return currentPos
        }
        
        const wrapperRect = wrapper.getBoundingClientRect()
        
        // Try to get the actual node element to match the calculation method used in updateToolbarPosition
        const nodeElement = getNodeElement()
        
        if (nodeElement) {
          // Use the same calculation method as updateToolbarPosition
          const nodeRect = nodeElement.getBoundingClientRect()
          const nodeX = nodeRect.left - wrapperRect.left
          const nodeY = nodeRect.top - wrapperRect.top
          
          // Calculate offset: where toolbar is vs where it should be (next to node)
          // This matches the calculation in updateToolbarPosition
          relativeOffsetRef.current = {
            x: currentPos.x - (nodeX + nodeRect.width),
            y: currentPos.y - nodeY
          }
        } else {
          // Fallback: use calculated screen position
          const pane = document.querySelector('.react-flow__pane') as HTMLElement
          if (!pane) {
            setIsDragging(false)
            return currentPos
          }
          
          const paneRect = pane.getBoundingClientRect()
          const paneOffsetX = paneRect.left - wrapperRect.left
          const paneOffsetY = paneRect.top - wrapperRect.top
          
          // Get current node screen position
          const currentScreenPos = reactFlowInstance.flowToScreenPosition({
            x: position.x,
            y: position.y
          })
          
          // Calculate the new relative offset based on final toolbar position
          relativeOffsetRef.current = {
            x: (currentPos.x - paneOffsetX) - currentScreenPos.x - nodeWidth,
            y: (currentPos.y - paneOffsetY) - currentScreenPos.y
          }
        }
        
        // Set flag to prevent immediate override
        justFinishedDraggingRef.current = true
        
        // Clear the flag after a short delay to allow automatic updates to resume
        setTimeout(() => {
          justFinishedDraggingRef.current = false
        }, 100)
        
        setIsDragging(false)
        
        // Return the current position unchanged - we just updated the offset
        return currentPos
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, reactFlowInstance, position.x, position.y, nodeWidth, wrapperRef, toolbarPosition])

  return (
    <div 
      ref={toolbarRef}
      className="absolute z-50 border border-border rounded-lg shadow-xl flex flex-col pointer-events-auto backdrop-blur-sm"
      style={{
        left: `${toolbarPosition.x}px`,
        top: `${toolbarPosition.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        position: 'absolute',
        animation: 'fadeIn 0.3s ease-in forwards',
        backgroundColor: 'hsl(var(--card) / 0.85)',
      }}
    >
      {/* Drag Handle at Top */}
      <div
        onMouseDown={handleMouseDown}
        className="w-full h-6 cursor-grab active:cursor-grabbing flex items-center justify-center border-b border-border bg-muted/50 hover:bg-muted transition-colors rounded-t-lg"
        title="Drag to move toolbar"
      >
        <div className="w-8 h-1 bg-muted-foreground/40 rounded-full"></div>
      </div>

      {/* Buttons Container */}
      <div className="p-1 flex flex-col gap-1 bg-card rounded-b-lg">
        {/* Edit Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
          title="Edit Node"
        >
          <Pencil className="w-4 h-4" />
        </Button>

        {/* Delete Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete Node"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {/* Duplicate Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDuplicate}
          className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
          title="Duplicate Node"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
