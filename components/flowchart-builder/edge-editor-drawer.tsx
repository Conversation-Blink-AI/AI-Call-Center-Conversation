
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Edge } from 'reactflow'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

interface EdgeEditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedEdge: Edge | null
  onUpdateEdge: (edgeId: string, updates: any) => void
  onDeleteEdge: (edgeId: string) => void
}

const edgeLabels = [
  { value: 'next', label: 'Next' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'end', label: 'End' },
  { value: 'custom', label: 'Custom' },
]

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
  const [customLabel, setCustomLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [animated, setAnimated] = useState(true)
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (selectedEdge) {
      setLabel(selectedEdge.data?.label || 'next')
      setCustomLabel(selectedEdge.data?.customLabel || '')
      setDescription(selectedEdge.data?.description || '')
      setColor(selectedEdge.data?.color || '#3b82f6')
      setAnimated(selectedEdge.animated || true)
    }
  }, [selectedEdge])

  // Clear search when popover opens
  useEffect(() => {
    if (open) {
      setSearchValue('')
    }
  }, [open])

  // Disable animations on popover - use MutationObserver to catch it immediately
  useEffect(() => {
    if (!open) return

    const disableAnimations = (element: HTMLElement) => {
      element.style.setProperty('animation', 'none', 'important')
      element.style.setProperty('transition', 'none', 'important')
      element.style.setProperty('transform', 'none', 'important')
      element.style.setProperty('opacity', '1', 'important')
      element.style.setProperty('scale', '1', 'important')
      
      // Remove animation classes
      element.classList.remove('animate-in', 'zoom-in-95', 'fade-in-0')
      element.classList.remove('slide-in-from-top-2', 'slide-in-from-bottom-2', 'slide-in-from-left-2', 'slide-in-from-right-2')
      
      // Also disable on all children
      element.querySelectorAll('*').forEach((child) => {
        const childEl = child as HTMLElement
        childEl.style.setProperty('animation', 'none', 'important')
        childEl.style.setProperty('transition', 'none', 'important')
      })
    }

    // Try multiple times with different delays to catch the element
    const timeouts: NodeJS.Timeout[] = []
    const tryDisable = () => {
      // Try various selectors to find the popover
      const selectors = [
        '.no-popover-animation',
        '[data-state="open"]',
        '[data-radix-popper-content-wrapper] > div',
        '[role="dialog"]',
      ]
      
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement
        if (element && element.closest('.no-popover-animation')) {
          disableAnimations(element)
          break
        }
      }
      
      // Also try finding by class
      const popoverByClass = document.querySelector('.no-popover-animation') as HTMLElement
      if (popoverByClass) {
        disableAnimations(popoverByClass)
      }
    }

    // Try immediately and with delays
    timeouts.push(setTimeout(tryDisable, 0))
    timeouts.push(setTimeout(tryDisable, 10))
    timeouts.push(setTimeout(tryDisable, 50))
    timeouts.push(setTimeout(tryDisable, 100))

    // Also use MutationObserver to catch when element is added
    const observer = new MutationObserver(() => {
      tryDisable()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      timeouts.forEach(clearTimeout)
      observer.disconnect()
    }
  }, [open])

  useEffect(() => {
    if (triggerRef.current) {
      const updateWidth = () => {
        if (triggerRef.current) {
          setPopoverWidth(triggerRef.current.offsetWidth)
        }
      }
      updateWidth()
      // Update on resize
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }
  }, [open, isOpen])

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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Edit Edge</SheetTitle>
          <SheetDescription>
            Configure the connection between nodes
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Edge Label */}
          <div className="space-y-2">
            <Label htmlFor="edge-label">Edge Label</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={triggerRef}
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {label || "Select or type label..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                align="start" 
                sideOffset={4}
                className="no-popover-animation p-0 w-[calc(100vw-4rem)] max-w-[352px]"
                style={{ 
                  width: popoverWidth ? `${popoverWidth}px` : undefined
                } as React.CSSProperties}
              >
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search or type label..." 
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>No label found.</CommandEmpty>
                    <CommandGroup>
                      {edgeLabels
                        .filter((option) => 
                          searchValue === '' || 
                          option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
                          option.value.toLowerCase().includes(searchValue.toLowerCase())
                        )
                        .map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setLabel(currentValue)
                              setSearchValue('')
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                label === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

          {/* Edge Info */}
          <div className="p-2 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-1 text-xs text-gray-500">Edge Information</h4>
            <div className="space-y-0.5 text-xs text-gray-600">
              <div className="break-all">ID: {selectedEdge.id}</div>
              <div>Source: {selectedEdge.source}</div>
              <div className="break-all">Target: {selectedEdge.target}</div>
            </div>
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
      </SheetContent>
    </Sheet>
  )
}
