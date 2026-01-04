'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Loader2, HelpCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { formatPhoneNumber } from "@/utils/phone-utils"
import React from "react"

interface ManageNumberPageProps {
  params: Promise<{
    number: string
  }>
}

interface FormData {
  prompt: string
  pathway_id: string
  pathway_version: number | null
  voice: string
  background_track: string
  first_sentence: string
  summary_prompt: string
  block_interruptions: boolean
  interruption_threshold: number
  model: string
  language: string
  record: boolean
}

export default function ManageNumberPage({ params }: ManageNumberPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpModalOpen, setHelpModalOpen] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      prompt: '',
      pathway_id: '',
      pathway_version: null,
      voice: '',
      background_track: 'null',
      first_sentence: '',
      summary_prompt: '',
      block_interruptions: false,
      interruption_threshold: 100,
      model: 'base',
      language: 'en-US',
      record: false,
    },
  })

  // Resolve async params
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params
        const rawNumber = resolvedParams?.number
        const decodedNumber = rawNumber ? decodeURIComponent(rawNumber) : null
        setPhoneNumber(decodedNumber)
        
        // Format phone number for display
        if (decodedNumber) {
          try {
            const normalizedNumber = decodedNumber.replace(/\D/g, "")
            const e164Number = normalizedNumber.startsWith("1") ? `+${normalizedNumber}` : `+1${normalizedNumber}`
            setFormattedPhoneNumber(formatPhoneNumber(e164Number))
          } catch (error) {
            console.error("❌ Error formatting phone number:", error)
            setFormattedPhoneNumber(decodedNumber)
          }
        }
      } catch (error) {
        console.error("❌ Error resolving params:", error)
        setError("Failed to load page parameters")
      } finally {
        setLoading(false)
      }
    }

    resolveParams()
  }, [params])

  // Help content for each section
  const getHelpContent = (section: string) => {
    const helpContents: Record<string, { title: string; content: React.ReactNode }> = {
      basic: {
        title: "Basic Settings Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Prompt</h3>
              <p className="text-sm text-muted-foreground mb-2">
                This is the main instructions for your AI agent. Write clear, detailed instructions about how the agent should behave, what information it should provide, and how it should handle conversations.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground italic">
                "You are a friendly customer service agent for ABC Company. Your role is to:
                <br />- Answer questions about our products politely
                <br />- Help customers with orders and returns
                <br />- Schedule appointments when requested
                <br />- Always be professional and helpful"
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Tip:</strong> Keep it under 2,000 characters for best results. Be specific about what the agent should do.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Pathway ID (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If you have created a pathway (a visual call flow) in the pathway builder, you can use it here instead of writing a prompt. The pathway will override the prompt field.
              </p>
              <p className="text-sm font-medium">When to use:</p>
              <p className="text-sm text-muted-foreground">
                Use a pathway when you have a complex call flow with multiple steps, decision points, or integrations. Leave empty to use the prompt instead.
              </p>
              <p className="text-sm font-medium mt-2">Example:</p>
              <p className="text-sm text-muted-foreground">pathway_abc123</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Pathway Version</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If you're using a pathway, you can specify which version to use. Leave empty to use the production (latest) version.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">Version 1, 2, 3, etc. Leave empty for the default production version.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">First Sentence</h3>
              <p className="text-sm text-muted-foreground mb-2">
                The exact first thing your AI agent will say when someone calls. This helps set a professional tone and makes the call feel more natural.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">"Hello, this is Sarah from ABC Company. How can I help you today?"</p>
              <p className="text-sm text-muted-foreground mt-1">"Good morning! Thank you for calling. What can I assist you with?"</p>
              <p className="text-sm text-muted-foreground mt-1">"Hi there! You've reached ABC Company. How may I help you?"</p>
            </div>
          </div>
        )
      },
      agent: {
        title: "Agent Parameters Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Voice</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Choose the AI voice that will speak during calls. Each voice has a unique sound and personality.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">maya, james, ravi, sarah, etc.</p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Tip:</strong> Check the API documentation or your voice library to see all available voices.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Model</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Choose the AI model that will handle conversations. Different models have different speeds and capabilities.
              </p>
              <p className="text-sm font-medium">Options:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Base (Recommended):</strong> Best balance of speed and quality. Good for most use cases.</li>
                <li><strong>Turbo (Fastest):</strong> Faster responses, great for quick interactions or high-volume calls.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Background Track</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Add subtle background sounds to make calls feel more natural, like being in an office or cafe.
              </p>
              <p className="text-sm font-medium">Options:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Default (Phone Static):</strong> Standard phone call sound</li>
                <li><strong>Office:</strong> Subtle office background noise</li>
                <li><strong>Cafe:</strong> Cafe ambiance sounds</li>
                <li><strong>Restaurant:</strong> Restaurant background sounds</li>
                <li><strong>None:</strong> No background sounds</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Language</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Set the language for conversations. The AI will speak and understand in this language.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">en-US (English - US), es-419 (Spanish - Latin America), fr-FR (French - France)</p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Tip:</strong> Use language codes like en-US, es-419, fr-FR, etc.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Interruption Threshold</h3>
              <p className="text-sm text-muted-foreground mb-2">
                How quickly the AI responds when interrupted. Lower values mean faster responses, higher values mean the AI waits longer before responding.
              </p>
              <p className="text-sm font-medium">Range:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>50:</strong> Very fast response, allows quick interruptions</li>
                <li><strong>100 (Recommended):</strong> Balanced response time</li>
                <li><strong>200:</strong> More patient, waits longer before responding</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Block Interruptions</h3>
              <p className="text-sm text-muted-foreground mb-2">
                When enabled, the AI will continue speaking even if the caller tries to interrupt. Useful for important announcements that must be heard completely.
              </p>
              <p className="text-sm font-medium">When to use:</p>
              <p className="text-sm text-muted-foreground">Enable for important messages, appointment reminders, or legal notices that need to be heard fully.</p>
            </div>
          </div>
        )
      },
      call: {
        title: "Call Settings Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Record Calls</h3>
              <p className="text-sm text-muted-foreground mb-2">
                When enabled, all calls to this number will be recorded. You can access recordings via the recording_url after the call completes.
              </p>
              <p className="text-sm font-medium">When to use:</p>
              <p className="text-sm text-muted-foreground">Enable recording for quality assurance, training purposes, or compliance requirements.</p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Important:</strong> Make sure you have permission to record calls according to local laws. Some regions require consent from both parties.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Summary Prompt</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Custom instructions for how the AI should summarize each call. This helps you get the specific information you need from every conversation.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground italic">
                "Summarize the call focusing on:
                <br />- Customer name and contact information
                <br />- Main concern or question
                <br />- Resolution status (resolved, pending, needs follow-up)
                <br />- Any action items or next steps"
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Tip:</strong> Be specific about what information you want in the summary. Maximum length: 2,000 characters.
              </p>
            </div>
          </div>
        )
      }
    }
    return helpContents[section] || { title: "Help", content: "No help content available." }
  }

  const onSubmit = async (data: FormData) => {
    if (!phoneNumber) {
      toast.error("Phone number is required")
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Build the request body
      const requestBody: any = {
        phone_number: phoneNumber,
      }

      // Only include fields that have values
      if (data.prompt && !data.pathway_id) {
        requestBody.prompt = data.prompt
      }
      if (data.pathway_id) {
        requestBody.pathway_id = data.pathway_id || null
      }
      if (data.pathway_version) {
        requestBody.pathway_version = data.pathway_version
      }
      if (data.voice) {
        requestBody.voice = data.voice
      }
      if (data.background_track && data.background_track !== 'null') {
        requestBody.background_track = data.background_track
      }
      if (data.first_sentence) {
        requestBody.first_sentence = data.first_sentence
      }
      if (data.summary_prompt) {
        requestBody.summary_prompt = data.summary_prompt
      }
      requestBody.block_interruptions = data.block_interruptions
      requestBody.interruption_threshold = data.interruption_threshold
      requestBody.model = data.model
      requestBody.language = data.language
      requestBody.record = data.record

      console.log("📤 [MANAGE-NUMBER] Sending update request:", requestBody)

      const response = await fetch('/api/bland-ai/inbound-number-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to update phone number')
      }

      if (result.success) {
        toast.success(result.message || "Phone number updated successfully")
        // Optionally redirect back after a delay
        setTimeout(() => {
          router.push('/dashboard/phone-numbers')
        }, 1500)
      } else {
        throw new Error(result.message || 'Update failed')
      }
    } catch (err) {
      console.error("❌ [MANAGE-NUMBER] Error updating phone number:", err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !phoneNumber) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{error}</p>
              <Button onClick={() => router.push('/dashboard/phone-numbers')} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Phone Numbers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 pb-12 max-w-4xl px-4 sm:px-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/phone-numbers')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Phone Numbers
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Manage Phone Number</h1>
        <p className="text-muted-foreground mt-2">
          Update settings for {formattedPhoneNumber || phoneNumber}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6 pb-4">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Basic Settings
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setHelpModalOpen('basic')
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardTitle>
              <CardDescription>
                Configure the core behavior of your inbound phone number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt *</Label>
                <Textarea
                  id="prompt"
                  {...register('prompt', { required: !watch('pathway_id') })}
                  placeholder="Provide instructions, relevant information, and examples of the ideal conversation flow..."
                  rows={6}
                  className="font-mono text-sm"
                />
                {errors.prompt && (
                  <p className="text-sm text-red-600">{errors.prompt.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Required unless Pathway ID is set. Keep it under 2,000 characters for best results.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pathway_id">Pathway ID (Optional)</Label>
                  <Input
                    id="pathway_id"
                    {...register('pathway_id')}
                    placeholder="Leave empty to use prompt"
                  />
                  <p className="text-xs text-muted-foreground">
                    Setting a pathway will override the prompt field
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pathway_version">Pathway Version</Label>
                  <Input
                    id="pathway_version"
                    type="number"
                    {...register('pathway_version', { valueAsNumber: true })}
                    placeholder="Default: production version"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="first_sentence">First Sentence</Label>
                <Input
                  id="first_sentence"
                  {...register('first_sentence')}
                  placeholder="e.g., 'Hello, this is Sarah. How can I help you today?'"
                />
                <p className="text-xs text-muted-foreground">
                  Makes your agent say a specific phrase for its first response
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Agent Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Agent Parameters
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setHelpModalOpen('agent')
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardTitle>
              <CardDescription>
                Customize voice, behavior, and interaction settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voice">Voice</Label>
                  <Input
                    id="voice"
                    {...register('voice')}
                    placeholder="e.g., maya, james"
                  />
                  <p className="text-xs text-muted-foreground">
                    Check available voices in the API documentation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={watch('model')}
                    onValueChange={(value) => setValue('model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base (Recommended)</SelectItem>
                      <SelectItem value="turbo">Turbo (Fastest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="background_track">Background Track</Label>
                  <Select
                    value={watch('background_track')}
                    onValueChange={(value) => setValue('background_track', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Default (Phone Static)</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="cafe">Cafe</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    {...register('language')}
                    placeholder="e.g., en-US, es-419"
                    defaultValue="en-US"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interruption_threshold">Interruption Threshold</Label>
                <Input
                  id="interruption_threshold"
                  type="number"
                  {...register('interruption_threshold', { valueAsNumber: true, min: 50, max: 200 })}
                  defaultValue={100}
                />
                <p className="text-xs text-muted-foreground">
                  Lower = faster response (50), Higher = more patient (200). Recommended: 100
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="block_interruptions">Block Interruptions</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the AI will not respond to user interruptions
                  </p>
                </div>
                <Switch
                  id="block_interruptions"
                  checked={watch('block_interruptions')}
                  onCheckedChange={(checked) => setValue('block_interruptions', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Call Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Call Settings
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setHelpModalOpen('call')
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardTitle>
              <CardDescription>
                Configure recording and summary options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="record">Record Calls</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable call recording. Access recordings via recording_url after call completion
                  </p>
                </div>
                <Switch
                  id="record"
                  checked={watch('record')}
                  onCheckedChange={(checked) => setValue('record', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary_prompt">Summary Prompt</Label>
                <Textarea
                  id="summary_prompt"
                  {...register('summary_prompt')}
                  placeholder="Custom instructions for how the call summary should be generated..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum length: 2000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/phone-numbers')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Help Modal */}
      <Dialog open={helpModalOpen !== null} onOpenChange={(open) => !open && setHelpModalOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{helpModalOpen ? getHelpContent(helpModalOpen).title : "Help"}</DialogTitle>
            <DialogDescription>
              Learn more about this section and how to fill it out correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {helpModalOpen ? getHelpContent(helpModalOpen).content : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

