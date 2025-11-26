'use client'

import React, { useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { ScrollArea } from '../ui/scroll-area'
import { toast } from 'sonner'
import { convertReactFlowToBland } from '../../services/reactflow-converter'
import { useRouter, usePathname } from 'next/navigation'

interface ReactFlowData {
  nodes: any[]
  edges: any[]
}

interface SavePathwayModalProps {
  reactFlowData: ReactFlowData
  pathwayId?: string // Optional for backwards compatibility
}

export function SavePathwayModal({ reactFlowData, pathwayId }: SavePathwayModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // No form fields needed - just saving flowchart data

  // Extract phone number from URL
  const getPhoneNumberFromPath = () => {
    const pathParts = pathname.split('/')
    const phoneNumberIndex = pathParts.findIndex(part => part === 'pathway') + 1
    return pathParts[phoneNumberIndex] || null
  }

  const phoneNumber = getPhoneNumberFromPath()
  const convertedData = convertReactFlowToBland(reactFlowData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (reactFlowData.nodes.length === 0) {
      toast.error("Cannot save empty flowchart. Please add some nodes first.")
      return
    }

    if (!pathwayId) {
      toast.error("No pathway ID found. Cannot save flowchart.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/pathways/save-flowchart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pathwayId,
          flowchartData: convertedData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save pathway')
      }

      // Set success state
      setIsSuccess(true)

      // Show success toast notification
      toast.success("✅ Pathway Saved Successfully!", {
        description: "Your flowchart changes have been saved to the database.",
        duration: 3000,
      })
      
      // Close modal after showing success state
      setTimeout(() => {
        setIsSuccess(false)
        setIsOpen(false)
        router.refresh()
      }, 1500)

    } catch (error) {
      console.error('Error saving pathway:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save pathway')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setShowPreview(false)
    setIsSuccess(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="sm"
        >
          <Save className="h-4 w-4 mr-1" />
          Save Pathway
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {pathwayId ? 'Update Pathway' : `Save Pathway for ${phoneNumber ? `+${phoneNumber}` : 'Phone Number'}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Show confirmation for pathway update */}
          <div className="space-y-4">
            {isSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-900">✅ Pathway Saved!</span>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Your flowchart has been successfully saved to the database.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">Updating Pathway</span>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  This will save your current flowchart changes for phone number <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">+{phoneNumber}</code>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Only the flowchart data will be updated
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Flowchart Data Preview</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>

            {showPreview && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <p><strong>Nodes:</strong> {reactFlowData.nodes.length}</p>
                  <p><strong>Edges:</strong> {reactFlowData.edges.length}</p>
                </div>
                <ScrollArea className="h-48 w-full rounded-md border p-4">
                  <pre className="text-xs">
                    {JSON.stringify(convertedData, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading || isSuccess}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isSuccess || !pathwayId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Pathway
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}