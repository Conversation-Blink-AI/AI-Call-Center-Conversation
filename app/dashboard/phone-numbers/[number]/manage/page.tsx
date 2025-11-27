'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { formatPhoneNumber } from "@/utils/phone-utils"

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
    <div className="container mx-auto py-8 max-w-4xl">
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
        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
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
              <CardTitle>Agent Parameters</CardTitle>
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
              <CardTitle>Call Settings</CardTitle>
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
    </div>
  )
}

