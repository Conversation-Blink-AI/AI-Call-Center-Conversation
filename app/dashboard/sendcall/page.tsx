"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  Phone, 
  Send, 
  FileText, 
  Users, 
  Building, 
  MapPin, 
  TrendingUp,
  Bookmark,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Settings,
  Clock,
  Brain,
  Mic,
  Database,
  BarChart3,
  Webhook,
  Zap
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface Pathway {
  id: string
  name: string
  description: string
  pathway_id?: string; // Added for potential use in SelectItem
  phone?: string; // Added for potential use in SelectItem
  pathway_name?: string; // Added for potential use in SelectItem
}

interface Voice {
  id: string
  name: string
  preview_url?: string
  description?: string
  public?: boolean
  tags?: string[]
}

interface CallData {
  phone_number: string
  voice?: string
  pathway_id?: string
  pathway_version?: number
  task?: string
  first_sentence?: string
  persona_id?: string
  model?: string
  language?: string
  wait_for_greeting?: boolean
  pronunciation_guide?: any[]
  temperature?: number
  interruption_threshold?: number
  from?: string
  dialing_strategy?: any
  timezone?: string
  start_time?: string
  transfer_phone_number?: string
  transfer_list?: any
  max_duration?: number
  tools?: any[]
  background_track?: string
  noise_cancellation?: boolean
  block_interruptions?: boolean
  record?: boolean
  voicemail?: any
  citation_schema_ids?: string[]
  summary_prompt?: string
  retry?: any
  dispositions?: string[]
  request_data?: any
  metadata?: any
  webhook?: string
  webhook_events?: string[]
  dynamic_data?: any[]
  keywords?: string[]
  ignore_button_press?: boolean
  precall_dtmf_sequence?: string
}

export default function SendCallPage() {
  const { user } = useAuth()
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Collapsible sections state
  const [openSections, setOpenSections] = useState({
    basic: true,
    model: false,
    dispatch: false,
    knowledge: false,
    audio: false,
    voicemail: false,
    analysis: false,
    postCall: false,
    advanced: false
  })

  // Form data state
  const [callData, setCallData] = useState<CallData>({
    phone_number: "",
    voice: "",
    task: "",
    first_sentence: "",
    model: "base",
    language: "en",
    wait_for_greeting: false,
    temperature: 0.7,
    interruption_threshold: 100,
    max_duration: 12,
    record: true,
    noise_cancellation: false,
    block_interruptions: false,
    background_track: "none"
  })

  // Separate state for country code and phone number
  const [selectedCountryCode, setSelectedCountryCode] = useState("+1")
  const [phoneNumberInput, setPhoneNumberInput] = useState("")

  // Sample prompts for quick selection
  const savedPrompts = [
    { id: "saved", name: "Saved Prompts", icon: Bookmark },
    { id: "telehealth", name: "Telehealth", icon: Users },
    { id: "small-business", name: "Small business", icon: Building },
    { id: "stadium", name: "Stadium venues", icon: MapPin },
    { id: "inbound-sales", name: "Inbound sales", icon: TrendingUp },
  ]

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateCallData = (field: keyof CallData, value: any) => {
    setCallData(prev => ({ ...prev, [field]: value }))
  }

  // Fetch user pathways and voices
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      try {
        setLoadingData(true)

        // Fetch pathways
        const pathwaysResponse = await fetch('/api/pathways', {
          credentials: 'include'
        })
        if (pathwaysResponse.ok) {
          const pathwaysData = await pathwaysResponse.json()
          setPathways(pathwaysData.pathways || [])
        }

        // Fetch voices
        const voicesResponse = await fetch('/api/bland-ai/voices', {
          credentials: 'include'
        })
        if (voicesResponse.ok) {
          const voicesData = await voicesResponse.json()
          setVoices(voicesData.voices || [])
          // Set default voice to first available or "ravi" (Indian voice)
          if (voicesData.voices?.length > 0 && !callData.voice) {
            const raviVoice = voicesData.voices.find((v: Voice) => v.name === "ravi")
            const indianVoice = voicesData.voices.find((v: Voice) => v.name.toLowerCase().includes("indian"))
            const defaultVoice = raviVoice?.id || indianVoice?.id || voicesData.voices[0].id
            console.log("Setting default voice:", defaultVoice, "from voice:", raviVoice?.name || indianVoice?.name || voicesData.voices[0].name)
            updateCallData('voice', defaultVoice)
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [user?.id])

  const handleSendCall = async () => {
    if (!callData.phone_number.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    if (!callData.pathway_id && !callData.task?.trim()) {
      toast.error('Please select a pathway or enter a prompt')
      return
    }

    // Validate voice selection
    if (!callData.voice) {
      toast.error('Please select a voice')
      return
    }

    setIsLoading(true)

    try {
      // Clean up the call data - remove undefined values
      const cleanCallData = Object.fromEntries(
        Object.entries(callData).filter(([_, v]) => v !== undefined && v !== "" && v !== null)
      )

      console.log("Final call data before sending:", cleanCallData)
      console.log("Voice ID being sent:", cleanCallData.voice)

      const response = await fetch('/api/bland-ai/send-test-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(cleanCallData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Call initiated successfully!')
        // Reset form
        setCallData(prev => ({
          ...prev,
          phone_number: "",
          task: "",
          first_sentence: ""
        }))
        setPhoneNumberInput("")
        setSelectedCountryCode("+1")
      } else {
        toast.error(data.error || 'Failed to send call')
      }
    } catch (error) {
      console.error('Error sending call:', error)
      toast.error('Failed to send call')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptSelect = (promptType: string) => {
    const prompts = {
      telehealth: "You are a helpful telehealth assistant. Help the patient with their healthcare needs and schedule appointments as needed.",
      "small-business": "You are a business assistant helping with customer inquiries, scheduling, and general business support.",
      stadium: "You are a stadium customer service representative helping with tickets, events, and venue information.",
      "inbound-sales": "You are a sales representative helping potential customers learn about our products and services.",
    }

    if (prompts[promptType as keyof typeof prompts]) {
      updateCallData('task', prompts[promptType as keyof typeof prompts])
    }
  }

  // Generate code preview
  const generateCodePreview = () => {
    const cleanData = Object.fromEntries(
      Object.entries(callData).filter(([_, v]) => v !== undefined && v !== "" && v !== null)
    )

    // Show the properly formatted phone number in preview
    const previewData = {
      ...cleanData,
      phone_number: phoneNumberInput ? `${selectedCountryCode}${phoneNumberInput}` : cleanData.phone_number
    }

    return `// Headers
const headers = {
  'Authorization': 'Bearer ${process.env.BLAND_AI_API_KEY || 'YOUR_BLAND_AI_API_KEY'}',
  'Content-Type': 'application/json'
};

// Data
const data = ${JSON.stringify(previewData, null, 2)};

// API request
const response = await fetch('https://api.bland.ai/v1/calls', {
  method: 'POST',
  headers,
  body: JSON.stringify(data)
});

const result = await response.json();
console.log('Call result:', result);`
  }

  // Mock country codes and placeholder for logic
  const countryCodes = [
    { flag: "🇺🇸", name: "United States", code: "+1" },
    { flag: "🇮🇳", name: "India", code: "+91" },
    { flag: "🇬🇧", name: "United Kingdom", code: "+44" },
    { flag: "🇩🇪", name: "Germany", code: "+49" },
  ]

  const [isMounted, setIsMounted] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0])
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const [pathwayDropdownOpen, setPathwayDropdownOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted || loadingData) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Send Call</h1>
          <p className="text-muted-foreground">Configure and send calls using the complete API</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            Object.keys(openSections).forEach(section => {
              setOpenSections(prev => ({ ...prev, [section]: false }))
            })
          }}>
            Collapse All
          </Button>
          <Button variant="outline" onClick={() => {
            Object.keys(openSections).forEach(section => {
              setOpenSections(prev => ({ ...prev, [section]: true }))
            })
          }}>
            Expand All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Form */}
        <div className="space-y-4">
          {/* Basic Section */}
          <Card>
            <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Basic
                    </div>
                    {openSections.basic ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    Essential call parameters - phone number, voice, and prompt
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="flex">
                      <Select 
                        value={selectedCountryCode} 
                        onValueChange={(value) => {
                          setSelectedCountryCode(value)
                          // Update the full phone number when country code changes
                          if (phoneNumberInput) {
                            const fullNumber = value + phoneNumberInput
                            updateCallData('phone_number', fullNumber)
                          }
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent 
                          className="z-50"
                          position="popper"
                          sideOffset={4}
                          avoidCollisions={true}
                        >
                          {countryCodes.map((country) => (
                            <SelectItem 
                              key={country.code}
                              value={country.code}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{country.flag}</span>
                                <span className="text-sm">{country.code}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        placeholder="1234567890"
                        value={phoneNumberInput}
                        onChange={(e) => {
                          const inputValue = e.target.value.replace(/\D/g, '') // Remove non-digits
                          setPhoneNumberInput(inputValue)
                          // Combine country code with phone number
                          const fullNumber = selectedCountryCode + inputValue
                          updateCallData('phone_number', fullNumber)
                        }}
                        className="flex-1"
                      />
                    </div>
                    {/* Show the full number that will be sent */}
                    {phoneNumberInput && (
                      <p className="text-xs text-muted-foreground">
                        Full number: {selectedCountryCode}{phoneNumberInput}
                      </p>
                    )}
                  </div>

                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="voice">Voice</Label>
                    <Select 
                      value={callData.voice || ""} 
                      onValueChange={(value) => {
                        console.log("Voice selected:", value)
                        updateCallData('voice', value)
                      }}
                    >
                      <SelectTrigger className="w-full" id="voice">
                        <SelectValue placeholder="Select a voice">
                          {callData.voice && voices.find(v => v.id === callData.voice) ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white flex-shrink-0">
                                {voices.find(v => v.id === callData.voice)?.name.charAt(0)}
                              </div>
                              <span>{voices.find(v => v.id === callData.voice)?.name}</span>
                            </div>
                          ) : (
                            "Select a voice"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-[200px] overflow-y-auto z-50" 
                        position="popper"
                        sideOffset={4}
                        avoidCollisions={true}
                      >
                        {voices.map((voice) => (
                          <SelectItem 
                            key={voice.id} 
                            value={voice.id}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white flex-shrink-0">
                                {voice.name.charAt(0)}
                              </div>
                              <span>{voice.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Show selected voice info */}
                    {callData.voice && voices.find(v => v.id === callData.voice) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white flex-shrink-0">
                          {voices.find(v => v.id === callData.voice)?.name.charAt(0)}
                        </div>
                        <span className="font-medium">{voices.find(v => v.id === callData.voice)?.name}</span>
                        <span className="text-xs">({callData.voice})</span>
                      </div>
                    )}
                  </div>

                  {/* Prompt or Pathway Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant={callData.task ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          updateCallData('pathway_id', "")
                          updateCallData('pathway_version', undefined)
                          updateCallData('task', callData.task || "")
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Prompt
                      </Button>
                      <Button
                        variant={callData.pathway_id ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          updateCallData('task', "")
                          updateCallData('pathway_id', callData.pathway_id || "")
                        }}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Pathway
                      </Button>
                    </div>

                    {!callData.task ? (
                      <div className="space-y-2">
                        <Label>Select Pathway</Label>
                        <Select 
                          value={callData.pathway_id || ""} 
                          onValueChange={(value) => updateCallData('pathway_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a pathway" />
                          </SelectTrigger>
                          <SelectContent 
                            className="max-h-[200px] overflow-y-auto z-50" 
                            position="popper"
                            sideOffset={4}
                            avoidCollisions={true}
                          >
                            {pathways.map((pathway) => (
                              <SelectItem 
                                key={pathway.id} 
                                value={pathway.pathway_id || pathway.id}
                                onSelect={(value) => {
                                  updateCallData('pathway_id', value)
                                }}
                              >
                                <div className="flex flex-col pointer-events-none">
                                  <span className="font-medium">{pathway.name}</span>
                                  {pathway.phone && (
                                    <span className="text-xs text-muted-foreground">Phone: {pathway.phone}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="space-y-2">
                          <Label>Pathway Version (optional)</Label>
                          <Input
                            type="number"
                            placeholder="123"
                            value={callData.pathway_version || ""}
                            onChange={(e) => updateCallData('pathway_version', e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Saved Prompts */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {savedPrompts.map((promptType) => (
                              <Button
                                key={promptType.id}
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromptSelect(promptType.id)}
                                className="h-8"
                              >
                                <promptType.icon className="h-3 w-3 mr-1" />
                                {promptType.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Prompt Text Area */}
                        <div className="space-y-2">
                          <Label>Task/Prompt</Label>
                          <Textarea
                            placeholder="Enter a prompt for the call"
                            value={callData.task || ""}
                            onChange={(e) => updateCallData('task', e.target.value)}
                            rows={6}
                            className="resize-none"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* First Sentence */}
                  <div className="space-y-2">
                    <Label>First Sentence</Label>
                    <Input
                      placeholder="Hello! This is..."
                      value={callData.first_sentence || ""}
                      onChange={(e) => updateCallData('first_sentence', e.target.value)}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Model Settings Section */}
          <Card>
            <Collapsible open={openSections.model} onOpenChange={() => toggleSection('model')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Model Settings
                    </div>
                    {openSections.model ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    AI model configuration and behavior settings
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select value={callData.model} onValueChange={(value) => updateCallData('model', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base">Base</SelectItem>
                          <SelectItem value="turbo">Turbo</SelectItem>
                          <SelectItem value="enhanced">Enhanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={callData.language} onValueChange={(value) => updateCallData('language', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Temperature (0-1)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={callData.temperature || ""}
                        onChange={(e) => updateCallData('temperature', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interruption Threshold</Label>
                      <Input
                        type="number"
                        value={callData.interruption_threshold || ""}
                        onChange={(e) => updateCallData('interruption_threshold', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wait-greeting"
                      checked={callData.wait_for_greeting || false}
                      onCheckedChange={(checked) => updateCallData('wait_for_greeting', checked)}
                    />
                    <Label htmlFor="wait-greeting">Wait for greeting</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Persona ID</Label>
                    <Input
                      placeholder="persona_123"
                      value={callData.persona_id || ""}
                      onChange={(e) => updateCallData('persona_id', e.target.value)}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Dispatch Settings Section */}
          <Card>
            <Collapsible open={openSections.dispatch} onOpenChange={() => toggleSection('dispatch')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Dispatch Settings
                    </div>
                    {openSections.dispatch ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    Call timing, transfers, and scheduling options
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Number</Label>
                      <Input
                        placeholder="+1234567890"
                        value={callData.from || ""}
                        onChange={(e) => updateCallData('from', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={callData.max_duration || ""}
                        onChange={(e) => updateCallData('max_duration', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select value={callData.timezone || ""} onValueChange={(value) => updateCallData('timezone', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="datetime-local"
                        value={callData.start_time || ""}
                        onChange={(e) => updateCallData('start_time', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Transfer Phone Number</Label>
                    <Input
                      placeholder="+1234567890"
                      value={callData.transfer_phone_number || ""}
                      onChange={(e) => updateCallData('transfer_phone_number', e.target.value)}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Audio Section */}
          <Card>
            <Collapsible open={openSections.audio} onOpenChange={() => toggleSection('audio')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="h-5 w-5" />
                      Audio Settings
                    </div>
                    {openSections.audio ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    Audio quality, background tracks, and recording options
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Background Track</Label>
                    <Select value={callData.background_track || "none"} onValueChange={(value) => updateCallData('background_track', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="cafe">Cafe</SelectItem>
                        <SelectItem value="nature">Nature</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="noise-cancellation"
                        checked={callData.noise_cancellation || false}
                        onCheckedChange={(checked) => updateCallData('noise_cancellation', checked)}
                      />
                      <Label htmlFor="noise-cancellation">Noise cancellation</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="block-interruptions"
                        checked={callData.block_interruptions || false}
                        onCheckedChange={(checked) => updateCallData('block_interruptions', checked)}
                      />
                      <Label htmlFor="block-interruptions">Block interruptions</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="record"
                        checked={callData.record !== false}
                        onCheckedChange={(checked) => updateCallData('record', checked)}
                      />
                      <Label htmlFor="record">Record call</Label>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Analysis Section */}
          <Card>
            <Collapsible open={openSections.analysis} onOpenChange={() => toggleSection('analysis')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Analysis & Reporting
                    </div>
                    {openSections.analysis ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    Call analysis, summaries, and custom metadata
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Summary Prompt</Label>
                    <Textarea
                      placeholder="Custom instructions for call summary..."
                      value={callData.summary_prompt || ""}
                      onChange={(e) => updateCallData('summary_prompt', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dispositions (comma-separated)</Label>
                    <Input
                      placeholder="interested, not-interested, callback"
                      value={callData.dispositions?.join(', ') || ""}
                      onChange={(e) => updateCallData('dispositions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      placeholder="pricing, appointment, demo"
                      value={callData.keywords?.join(', ') || ""}
                      onChange={(e) => updateCallData('keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Post Call Section */}
          <Card>
            <Collapsible open={openSections.postCall} onOpenChange={() => toggleSection('postCall')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-5 w-5" />
                      Post Call Actions
                    </div>
                    {openSections.postCall ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    Webhooks, notifications, and follow-up actions
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      placeholder="https://your-app.com/webhook"
                      value={callData.webhook || ""}
                      onChange={(e) => updateCallData('webhook', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Events (comma-separated)</Label>
                    <Input
                      placeholder="call_started, call_ended, call_analyzed"
                      value={callData.webhook_events?.join(', ') || ""}
                      onChange={(e) => updateCallData('webhook_events', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Advanced Section */}
          <Card>
            <Collapsible open={openSections.advanced} onOpenChange={() => toggleSection('advanced')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Advanced Options
                    </div>
                    {openSections.advanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    Advanced configuration and custom parameters
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pre-call DTMF Sequence</Label>
                    <Input
                      placeholder="1234#"
                      value={callData.precall_dtmf_sequence || ""}
                      onChange={(e) => updateCallData('precall_dtmf_sequence', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ignore-button-press"
                      checked={callData.ignore_button_press || false}
                      onCheckedChange={(checked) => updateCallData('ignore_button_press', checked)}
                    />
                    <Label htmlFor="ignore-button-press">Ignore button press</Label>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Send Button */}
          <Button 
            onClick={handleSendCall} 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? "Sending Call..." : "Send Call"}
          </Button>
        </div>

        {/* Right Panel - Code Preview */}
        <div className="space-y-6 sticky top-6">
          <Card className="bg-slate-900 text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">JavaScript</Badge>
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    Live Preview
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono overflow-auto max-h-[600px]">
                <code>{generateCodePreview()}</code>
              </pre>
            </CardContent>
          </Card>

          
        </div>
      </div>
    </div>
  )
}