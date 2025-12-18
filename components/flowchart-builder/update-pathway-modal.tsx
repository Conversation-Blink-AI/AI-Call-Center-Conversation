
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { ScrollArea } from '../ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from '../ui/use-toast'
import { convertReactFlowToBland, type ReactFlowData } from '../../services/reactflow-converter'
import { Loader2, Send, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface Pathway {
  id: string
  name: string
  description?: string | null
  bland_id?: string | null
  phone_number?: string | null
}

interface UpdatePathwayModalProps {
  reactFlowData: ReactFlowData
  pathwayId: string
}

export function UpdatePathwayModal({ reactFlowData, pathwayId }: UpdatePathwayModalProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Pathway fetching state
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [loadingPathways, setLoadingPathways] = useState(false)

  // Form fields
  const [manualPathwayId, setManualPathwayId] = useState(pathwayId || '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const convertedData = convertReactFlowToBland(reactFlowData)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to top when preview is shown
  useEffect(() => {
    if (showPreview && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [showPreview])

  // Fetch pathways when modal opens and user is available
  useEffect(() => {
    const fetchPathways = async () => {
      if (!user?.id || !isOpen) return

      try {
        setLoadingPathways(true)
        const response = await fetch('/api/pathways', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setPathways(data.pathways || [])
        } else {
          console.error('Failed to fetch pathways')
          toast({
            title: "Error",
            description: "Failed to load pathways",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching pathways:', error)
        toast({
          title: "Error",
          description: "An error occurred while loading pathways",
          variant: "destructive",
        })
      } finally {
        setLoadingPathways(false)
      }
    }

    fetchPathways()
  }, [user?.id, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!manualPathwayId || !manualPathwayId.trim()) {
      toast({
        title: "Error",
        description: "Pathway ID is required",
        variant: "destructive",
      })
      return
    }

    if (!name || !name.trim()) {
      toast({
        title: "Error",
        description: "Pathway name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/bland-ai/update-pathway-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pathwayId: manualPathwayId.trim(),
          name: name.trim(),
          description: description || '',
          nodes: convertedData.nodes,
          edges: convertedData.edges,
        }),
      })

      const result = await response.json()

      if (result.status === 'success') {
        setIsSuccess(true)
        
        toast({
          title: "✅ Success!",
          description: "Pathway Deployed successfully",
          variant: "default",
        })

        // Show additional success feedback
        console.log("✅ Pathway updated successfully:", result)

        // Reset form and close modal after showing success
        setTimeout(() => {
          setManualPathwayId(pathwayId || '')
          setName('')
          setDescription('')
          setIsSuccess(false)
          setIsOpen(false)
          setShowPreview(false)
        }, 2000)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update pathway",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating pathway:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const finalPayload = {
    name: name || '',
    description: description || `Updated on ${new Date().toISOString()}`,
    nodes: convertedData.nodes,
    edges: convertedData.edges,
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          size="sm"
        >
          🚀 Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Update Pathway</DialogTitle>
        </DialogHeader>

        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-6">
          {isSuccess ? (
            // Success State
            <div className="text-center py-8 space-y-4">
              <div className="text-6xl">✅</div>
              <h3 className="text-xl font-semibold text-green-700">Success!</h3>
              <p className="text-green-600">Pathway Deployed successfully</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  <strong>Pathway ID:</strong> {manualPathwayId}
                </p>
                <p className="text-sm text-green-700">
                  <strong>Name:</strong> {name}
                </p>
              </div>
            </div>
          ) : !showPreview ? (
            // Form View
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pathwayId">Select Pathway *</Label>
                <div className="px-1">
                  <Select
                    value={manualPathwayId || ""}
                    onValueChange={(value) => {
                      setManualPathwayId(value)
                      // Auto-fill name and description from selected pathway (only if fields are empty)
                      const selectedPathway = pathways.find(
                        (p) => (p.bland_id || p.id) === value
                      )
                      if (selectedPathway) {
                        if (!name || name.trim() === '') {
                          setName(selectedPathway.name)
                        }
                        if ((!description || description.trim() === '') && selectedPathway.description) {
                          setDescription(selectedPathway.description)
                        }
                      }
                    }}
                    disabled={loadingPathways}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingPathways ? "Loading pathways..." : "Choose a pathway"} />
                    </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto z-50"
                    position="popper"
                    sideOffset={4}
                    avoidCollisions={true}
                  >
                    {pathways.length === 0 && !loadingPathways ? (
                      <SelectItem value="" disabled>
                        No pathways found
                      </SelectItem>
                    ) : (
                      pathways.map((pathway) => (
                        <SelectItem
                          key={pathway.id}
                          value={pathway.bland_id || pathway.id}
                        >
                          <div className="flex flex-col pointer-events-none gap-1">
                            <span className="font-medium">{pathway.name}</span>
                            {pathway.phone_number && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 w-fit">
                                Phone: {pathway.phone_number}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                  </Select>
                </div>
                {manualPathwayId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Selected Pathway ID:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {manualPathwayId}
                    </code>
                  </div>
                )}
                <p className="text-xs text-gray-500">Select a pathway to update, or manually enter the pathway ID below</p>
                <div className="mt-2">
                  <Label htmlFor="pathwayIdManual" className="text-xs text-muted-foreground">
                    Or enter Pathway ID manually:
                  </Label>
                  <div className="mt-1 px-1">
                    <Input
                      id="pathwayIdManual"
                      placeholder="Enter pathway ID"
                      value={manualPathwayId}
                      onChange={(e) => setManualPathwayId(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Pathway Name *</Label>
                <div className="px-1">
                  <Input
                    id="name"
                    placeholder="My Pathway"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">The name of your conversational pathway</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <div className="px-1">
                  <Textarea
                    id="description"
                    placeholder="A description of the pathway..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <p className="text-xs text-gray-500">Optional description of your pathway</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-200">Converted Data Summary:</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded border-l-4 border-blue-500 dark:border-blue-500">
                    <p className="text-gray-900 dark:text-gray-200"><strong>Pathway ID:</strong> <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded text-xs text-blue-800 dark:text-blue-200">{manualPathwayId || 'Not set'}</code></p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">This ID will be used in the API request to Bland.ai</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-900 dark:text-gray-200"><strong>Original Nodes:</strong> {reactFlowData.nodes.length}</p>
                      <p className="text-gray-900 dark:text-gray-200"><strong>Cleaned Nodes:</strong> {convertedData.nodes.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-gray-200"><strong>Original Edges:</strong> {reactFlowData.edges.length}</p>
                      <p className="text-gray-900 dark:text-gray-200"><strong>Cleaned Edges:</strong> {convertedData.edges.length}</p>
                    </div>
                  </div>
                </div>
                <p className="text-green-700 dark:text-green-400 text-xs mt-2">✅ UI-specific properties will be removed before sending</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview Payload
                </Button>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isLoading ? 'Updating...' : 'Deploy'}
                </Button>
              </div>
            </form>
          ) : (
            // Preview View
            <div className="space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-background dark:bg-background z-10 pb-2 pt-1 -mt-1 border-b">
                <h3 className="font-semibold">Final Payload Preview</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  size="sm"
                >
                  ← Back to Form
                </Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Pathway ID:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{manualPathwayId || 'Not set'}</code></div>
                  <div><strong>API Key:</strong> Stored in environment</div>
                  <div><strong>Name:</strong> {name || 'Not set'}</div>
                  <div><strong>Description:</strong> {description || 'Auto-generated'}</div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">JSON Payload:</h4>
                  <ScrollArea className="h-48 w-full rounded-md border p-4">
                    <pre className="text-xs">
                      {JSON.stringify(finalPayload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !manualPathwayId || !name}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating Pathway...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Confirm & Deploy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
