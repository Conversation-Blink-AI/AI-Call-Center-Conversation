'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wand2, ArrowLeft, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { FlowchartCanvas } from '@/components/flowchart-builder/flowchart-canvas'
import { useAuth } from '@/contexts/auth-context'
import type { Node, Edge } from 'reactflow'

interface ReactFlowData {
  nodes: Node[]
  edges: Edge[]
}

export default function GeneratePathwayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phoneNumber = searchParams.get('phoneNumber')
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [generatedFlowchart, setGeneratedFlowchart] = useState<ReactFlowData | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // Authentication check - same pattern as dashboard page
  // Middleware handles server-side JWT verification, auth context handles client-side
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Handle unauthenticated users - redirect to home (same as dashboard)
  if (!authLoading && !user) {
    useEffect(() => {
      router.push("/")
    }, [router])

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your call flow')
      return
    }

    // User is already authenticated at this point (checked by middleware + auth context)
    // No need for additional auth checks - trust the auth context state
    if (!user) {
      setError('You must be logged in to generate call flows.')
      router.push('/')
      return
    }

    setIsGenerating(true)
    setError('') // Clear any previous errors
    setGeneratedFlowchart(null)

    try {
      console.log('🚀 Generating call flow with prompt:', prompt)
      console.log('👤 User authenticated:', user.email)
      console.log('👤 User ID:', user.id)
      
      // Get API key from localStorage if available
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('openrouter_api_key') : null
      
      console.log('📤 Making API request to /api/generate-pathway (NO AUTH REQUIRED)')
      
      // Use absolute URL to ensure cookies are sent
      const apiUrl = `${window.location.origin}/api/generate-pathway`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'same-origin',
        cache: 'no-store', // Force no cache
        body: JSON.stringify({ 
          prompt,
          ...(apiKey && { apiKey })
        }),
      })
      
      console.log('📡 Response status:', response.status, response.statusText)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      const result = await response.json()
      console.log('📡 Response body:', result)

      if (!response.ok) {
        // Log the full error for debugging
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          result: result
        })
        
        const errorMessage = result.message || result.error || 'Failed to generate call flow'
        const errorDetails = result.details ? `\n\nDetails: ${result.details}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }

      console.log('✅ Generated flowchart data:', result)
      setGeneratedFlowchart(result)
      toast.success('Call flow generated successfully!')

    } catch (err) {
      console.error('❌ Generation error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate call flow'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }


  const examplePrompts = [
    "Create a Medicare insurance qualification call flow that screens for eligibility and transfers qualified leads to an agent",
    "Build a healthcare appointment booking flow that collects symptoms, schedules appointments, and sends confirmations",
    "Design a sales qualification call for software demos that identifies decision makers and schedules product presentations",
    "Create a customer support flow that troubleshoots common issues and escalates complex problems to human agents",
    "Build a lead qualification flow for real estate that determines buying timeline and connects with local agents"
  ]

  const getBackUrl = () => {
    if (phoneNumber) {
      return `/dashboard/pathway/${phoneNumber}`
    }
    return '/dashboard/pathway'
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card shadow-sm z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(getBackUrl())}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Generate Call Flow with AI</h1>
              <p className="text-sm text-muted-foreground">Describe your call flow and let AI create it for you</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="lg:hidden"
            >
              {isPanelCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Collapsible Input Panel */}
          {!isPanelCollapsed && (
            <div className="w-80 lg:w-96 transition-all duration-300 ease-in-out border-r bg-card shadow-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                <h3 className="font-semibold text-sm">AI Flow Generator</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                  className="h-6 w-6"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div>
                  <Label htmlFor="prompt" className="text-sm font-medium">Call Flow Description</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: Create a Medicare insurance qualification call flow that screens for eligibility, asks about current coverage, handles objections, and transfers qualified leads to a specialist..."
                    rows={6}
                    className="mt-2 resize-none"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Flow...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Call Flow
                    </>
                  )}
                </Button>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Example Prompts:</Label>
                  <div className="space-y-1">
                    {examplePrompts.map((example, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full text-left h-auto p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted whitespace-normal leading-relaxed"
                        onClick={() => setPrompt(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPanelCollapsed && (
            <div className="absolute top-4 left-4 z-20">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsPanelCollapsed(false)}
                className="bg-card shadow-lg border-border hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 relative bg-background w-full">
            {!generatedFlowchart && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Wand2 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-foreground mb-3">Ready to Generate</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Enter a description in the panel {isPanelCollapsed ? '(click the arrow to open)' : ''} and click "Generate Call Flow" to see your AI-powered flowchart
                  </p>
                  {isPanelCollapsed && (
                    <Button 
                      variant="outline"
                      onClick={() => setIsPanelCollapsed(false)}
                      className="mt-4"
                    >
                      <PanelLeftOpen className="h-4 w-4 mr-2" />
                      Open Generator Panel
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90">
                <div className="text-center">
                  <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
                  <h3 className="text-xl font-semibold text-foreground mb-3">Generating Your Call Flow</h3>
                  <p className="text-muted-foreground">AI is creating your custom flowchart...</p>
                </div>
              </div>
            )}

            {generatedFlowchart && (
              <div className="h-full w-full">
                <FlowchartCanvas 
                  initialNodes={generatedFlowchart.nodes}
                  initialEdges={generatedFlowchart.edges}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
