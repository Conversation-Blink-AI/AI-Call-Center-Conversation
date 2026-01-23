
'use client'

import React, { useState, useEffect } from 'react'
import { Edge } from 'reactflow'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Trash2, HelpCircle } from 'lucide-react'

interface EdgeEditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedEdge: Edge | null
  onUpdateEdge: (edgeId: string, updates: any) => void
  onDeleteEdge: (edgeId: string) => void
}

const edgeColors = [
  { value: '#3b82f6', label: 'Blue', color: '#3b82f6' },
  { value: '#10b981', label: 'Green', color: '#10b981' },
  { value: '#ef4444', label: 'Red', color: '#ef4444' },
  { value: '#f59e0b', label: 'Orange', color: '#f59e0b' },
  { value: '#8b5cf6', label: 'Purple', color: '#8b5cf6' },
  { value: '#6b7280', label: 'Gray', color: '#6b7280' },
]

export function EdgeEditorDrawer({
  isOpen,
  onClose,
  selectedEdge,
  onUpdateEdge,
  onDeleteEdge,
}: EdgeEditorDrawerProps) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [animated, setAnimated] = useState(true)
  const [tooltipOpen, setTooltipOpen] = useState(false)

  useEffect(() => {
    if (selectedEdge) {
      setLabel(selectedEdge.data?.label || 'next')
      setDescription(selectedEdge.data?.description || '')
      setColor(selectedEdge.data?.color || '#3b82f6')
      setAnimated(selectedEdge.animated || true)
    }
  }, [selectedEdge])

  const handleSave = () => {
    if (!selectedEdge) return

    const updates = {
      data: {
        ...selectedEdge.data,
        label: label || 'next',
        description: description || undefined,
        color,
      },
      animated,
      style: {
        ...selectedEdge.style,
        stroke: color,
      },
    }

    onUpdateEdge(selectedEdge.id, updates)
    onClose()
  }

  const handleDelete = () => {
    if (!selectedEdge) return
    onDeleteEdge(selectedEdge.id)
  }

  if (!selectedEdge) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Edge</DialogTitle>
          <DialogDescription>
            Configure the connection between nodes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Pathway Label */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="pathway-label">Pathway Label</Label>
              <Popover open={tooltipOpen} onOpenChange={setTooltipOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Help with pathway label examples"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="max-w-xs p-3"
                  side="right"
                  align="start"
                >
                  <div className="space-y-2">
                    <p className="font-semibold mb-2">Example pathway labels:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>&quot;user said yes&quot;</li>
                      <li>&quot;user said no&quot;</li>
                      <li>&quot;Age &gt; 65&quot;</li>
                      <li>&quot;opted for callback&quot;</li>
                      <li>&quot;interested in pricing&quot;</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Keep labels short and descriptive of the condition that triggers this pathway.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a label that describes when this pathway should be chosen. Keep it short and succinct e.g. user said yes
            </p>
            <Input
              id="pathway-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter pathway label..."
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">
              {label.length}/100
            </p>
          </div>

          {/* Edge Description */}
          <div className="space-y-2">
            <Label htmlFor="edge-description">Description (Optional)</Label>
            <Input
              id="edge-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when this path should be taken..."
            />
            <p className="text-xs text-gray-500">Optional description for this edge connection</p>
          </div>

          {/* Edge Color */}
          <div className="space-y-2">
            <Label htmlFor="edge-color">Edge Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {edgeColors.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Animation Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="animated"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="animated">Animated</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
