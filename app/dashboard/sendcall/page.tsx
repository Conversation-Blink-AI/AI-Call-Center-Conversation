"use client"

import React, { useMemo, useState, useEffect, useRef } from "react"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  Zap,
  HelpCircle,
  Play,
  Pause,
  Loader2
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
  description: string | null
  voiceId: string
  tags: string[]
  gender?: string | null
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

interface PurchasedNumber {
  id: string
  number: string
}

export default function SendCallPage() {
  const { user } = useAuth()
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [voicesError, setVoicesError] = useState<string | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [purchasedNumbers, setPurchasedNumbers] = useState<PurchasedNumber[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const getGenderEmoji = (gender?: string | null) => {
    const normalizedGender = String(gender ?? "").trim().toLowerCase()
    if (normalizedGender === "female") {
      return { emoji: "👩", label: "Female voice" }
    }
    if (normalizedGender === "male") {
      return { emoji: "👨", label: "Male voice" }
    }
    if (normalizedGender === "neutral") {
      return { emoji: "🧑", label: "Neutral voice" }
    }
    return null
  }

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
        try {
          setVoicesLoading(true)
          setVoicesError(null)
          const voicesResponse = await fetch('/api/voices', {
            credentials: 'include'
          })
          if (voicesResponse.ok) {
            const voicesData = await voicesResponse.json()
            setVoices(voicesData.voices || [])
            if (voicesData.voices?.length > 0 && !callData.voice) {
              const defaultVoice = voicesData.voices[0].voiceId
              updateCallData('voice', defaultVoice)
            }
          } else {
            const errorData = await voicesResponse.json().catch(() => ({}))
            throw new Error(errorData.error || "Failed to load voices")
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load voices"
          setVoicesError(errorMessage)
        } finally {
          setVoicesLoading(false)
        }

        // Fetch user's purchased phone numbers
        const phoneNumbersResponse = await fetch('/api/user/phone-numbers', {
          credentials: 'include'
        })
        if (phoneNumbersResponse.ok) {
          const phoneNumbersData = await phoneNumbersResponse.json()
          if (phoneNumbersData.success && phoneNumbersData.phoneNumbers) {
            setPurchasedNumbers(phoneNumbersData.phoneNumbers.map((pn: any) => ({
              id: pn.id,
              number: pn.number
            })))
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

  const selectedVoice = useMemo(() => {
    if (!callData.voice) return null
    return voices.find((voice) => voice.voiceId === callData.voice) || null
  }, [callData.voice, voices])
  const selectedVoiceGenderEmoji = getGenderEmoji(selectedVoice?.gender)

  const stopVoiceSample = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoiceId(null)
    setLoadingVoiceId(null)
  }

  const playVoiceSample = async (voiceId: string, voiceName: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setPlayingVoiceId(null)
      setLoadingVoiceId(voiceId)

      const response = await fetch(`/api/bland-ai/voices/${voiceId}/sample`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Hey this is Hustle AI, can you hear me alright?"
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to generate voice sample")
      }

      const contentType = response.headers.get("content-type")
      let audioSource: string | null = null

      if (contentType && contentType.includes("audio")) {
        const audioBlob = await response.blob()
        audioSource = URL.createObjectURL(audioBlob)
      } else {
        const data = await response.json()
        audioSource = data.audio_url || null
      }

      if (!audioSource) {
        throw new Error("No audio data received")
      }

      const audio = new Audio(audioSource)
      audioRef.current = audio

      audio.oncanplaythrough = () => {
        setLoadingVoiceId(null)
        setPlayingVoiceId(voiceId)
        audio.play().catch(() => {
          setPlayingVoiceId(null)
          setLoadingVoiceId(null)
        })
      }

      audio.onended = () => {
        setPlayingVoiceId(null)
        setLoadingVoiceId(null)
        if (audioSource?.startsWith("blob:")) {
          URL.revokeObjectURL(audioSource)
        }
      }

      audio.onerror = () => {
        setPlayingVoiceId(null)
        setLoadingVoiceId(null)
      }

      audio.load()

      console.log("🎵 [VOICE PREVIEW] Playing sample:", voiceName)
    } catch (err) {
      console.error("Error playing voice sample:", err)
      setPlayingVoiceId(null)
      setLoadingVoiceId(null)
      toast.error("Failed to play voice preview")
    }
  }

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

    // Validate from number selection
    if (!callData.from) {
      setFromNumberAlertOpen(true)
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
  const [helpModalOpen, setHelpModalOpen] = useState<string | null>(null)
  const [fromNumberAlertOpen, setFromNumberAlertOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Help content for each section
  const getHelpContent = (section: string) => {
    const helpContents: Record<string, { title: string; content: React.ReactNode }> = {
      basic: {
        title: "Basic Settings Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Phone Number</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Enter the phone number you want to call. Include the country code (like +1 for US, +91 for India).
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">+1 1234567890 (US number)</p>
              <p className="text-sm text-muted-foreground">+91 9876543210 (Indian number)</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Voice</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Choose the AI voice that will speak during the call. Each voice has a unique sound and personality.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">Select "ravi" for an Indian accent voice, or choose from other available voices.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Prompt or Pathway</h3>
              <p className="text-sm text-muted-foreground mb-2">
                You can either write a custom prompt (instructions for the AI) or select a pre-built pathway (a saved call flow).
              </p>
              <p className="text-sm font-medium">Prompt Example:</p>
              <p className="text-sm text-muted-foreground italic">"You are a helpful customer service agent. Answer questions politely and help customers with their orders."</p>
              <p className="text-sm font-medium mt-2">Pathway:</p>
              <p className="text-sm text-muted-foreground">Select a saved pathway from the dropdown if you have created one before.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">First Sentence</h3>
              <p className="text-sm text-muted-foreground mb-2">
                The first thing the AI will say when the call connects. This helps set the tone for the conversation.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">"Hello! This is Sarah calling from ABC Company. How can I help you today?"</p>
            </div>
          </div>
        )
      },
      model: {
        title: "Model Settings Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Model</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Choose the AI model that will handle the conversation. Different models have different speeds and capabilities.
              </p>
              <p className="text-sm font-medium">Options:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Base:</strong> Standard model, good balance of speed and quality</li>
                <li><strong>Turbo:</strong> Faster responses, good for quick interactions</li>
                <li><strong>Enhanced:</strong> More detailed and thoughtful responses</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Language</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Select the language for the conversation. The AI will speak and understand in this language.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">Choose "English" for English conversations, "Spanish" for Spanish, etc.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Temperature (0-1)</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Controls how creative or predictable the AI responses are. Lower values (0.3-0.5) make responses more consistent. Higher values (0.7-0.9) make responses more varied and creative.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">Use 0.7 for balanced conversations, 0.3 for very consistent responses, 0.9 for creative conversations.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Interruption Threshold</h3>
              <p className="text-sm text-muted-foreground mb-2">
                How long (in milliseconds) the AI waits before it can be interrupted by the person on the call. Lower values allow quicker interruptions.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">100ms = quick interruptions allowed, 500ms = longer wait before interruption</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Wait for Greeting</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If checked, the AI will wait for the person to say "hello" or greet before starting the conversation. This makes calls feel more natural.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Persona ID</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Optional: If you have created a custom persona (a specific AI personality), enter its ID here.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">persona_123</p>
            </div>
          </div>
        )
      },
      dispatch: {
        title: "Dispatch Settings Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">From Number</h3>
              <p className="text-sm text-muted-foreground mb-2">
                The phone number that will appear as the caller ID. This should be a number you own or have permission to use.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">+1 5551234567</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Max Duration (minutes)</h3>
              <p className="text-sm text-muted-foreground mb-2">
                The maximum length of the call in minutes. The call will automatically end after this time.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">12 minutes = call ends after 12 minutes even if still talking</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Timezone</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Select the timezone for scheduling calls. This ensures calls happen at the right local time.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">America/New_York for Eastern Time, America/Los_Angeles for Pacific Time</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Start Time</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Schedule the call for a specific date and time. Leave empty to make the call immediately.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">2024-01-15, 10:30 AM - call will be made on January 15th at 10:30 AM</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Transfer Phone Number</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If you want to transfer the call to a human agent or another number, enter that number here. The AI can transfer the call when needed.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">+1 5559876543 - calls will be transferred to this number when requested</p>
            </div>
          </div>
        )
      },
      audio: {
        title: "Audio Settings Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Background Track</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Add background sounds to make the call feel more natural, like being in an office or cafe.
              </p>
              <p className="text-sm font-medium">Options:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>None:</strong> No background sounds</li>
                <li><strong>Office:</strong> Subtle office background noise</li>
                <li><strong>Cafe:</strong> Cafe ambiance sounds</li>
                <li><strong>Nature:</strong> Natural outdoor sounds</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Noise Cancellation</h3>
              <p className="text-sm text-muted-foreground mb-2">
                When enabled, the system removes background noise from the call, making it clearer for both parties.
              </p>
              <p className="text-sm font-medium">When to use:</p>
              <p className="text-sm text-muted-foreground">Enable this if the person receiving the call might be in a noisy environment.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Block Interruptions</h3>
              <p className="text-sm text-muted-foreground mb-2">
                When enabled, the AI will continue speaking even if the other person tries to interrupt. Useful for important announcements.
              </p>
              <p className="text-sm font-medium">When to use:</p>
              <p className="text-sm text-muted-foreground">Use for important messages that must be heard completely, like appointment reminders.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Record Call</h3>
              <p className="text-sm text-muted-foreground mb-2">
                When enabled, the call will be recorded so you can listen to it later for quality checks or training purposes.
              </p>
              <p className="text-sm font-medium">Note:</p>
              <p className="text-sm text-muted-foreground">Make sure you have permission to record calls according to local laws.</p>
            </div>
          </div>
        )
      },
      analysis: {
        title: "Analysis & Reporting Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Summary Prompt</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Custom instructions for how the AI should summarize the call. This helps you get the information you need from each call.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground italic">"Summarize the call focusing on: customer name, main concern, resolution status, and follow-up needed."</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Dispositions</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Categories to classify the call outcome. Helps you organize and track different types of call results.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">interested, not-interested, callback, appointment-scheduled</p>
              <p className="text-sm text-muted-foreground mt-1">Separate multiple dispositions with commas.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Keywords</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Important words or phrases to track during the call. The system will highlight when these are mentioned.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">pricing, appointment, demo, refund, complaint</p>
              <p className="text-sm text-muted-foreground mt-1">Separate multiple keywords with commas.</p>
            </div>
          </div>
        )
      },
      postCall: {
        title: "Post Call Actions Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Webhook URL</h3>
              <p className="text-sm text-muted-foreground mb-2">
                A web address where the system will send information about the call after it ends. This lets your app know when calls complete.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">https://your-app.com/webhook/call-completed</p>
              <p className="text-sm text-muted-foreground mt-1">Your server should be ready to receive POST requests at this URL.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Webhook Events</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Choose which events should trigger a webhook notification. This helps you get updates at the right times.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">call_started, call_ended, call_analyzed</p>
              <p className="text-sm font-medium mt-2">Common Events:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>call_started:</strong> When the call begins</li>
                <li><strong>call_ended:</strong> When the call finishes</li>
                <li><strong>call_analyzed:</strong> When the call summary is ready</li>
              </ul>
            </div>
          </div>
        )
      },
      advanced: {
        title: "Advanced Options Help",
        content: (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Pre-call DTMF Sequence</h3>
              <p className="text-sm text-muted-foreground mb-2">
                DTMF tones (like phone keypad sounds) to play before the call connects. Some phone systems require this to route calls correctly.
              </p>
              <p className="text-sm font-medium">Example:</p>
              <p className="text-sm text-muted-foreground">1234# - plays tones 1, 2, 3, 4, then #</p>
              <p className="text-sm text-muted-foreground mt-1">Use numbers 0-9, * and # symbols.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Ignore Button Press</h3>
              <p className="text-sm text-muted-foreground mb-2">
                When enabled, the AI will ignore any button presses (like pressing 1, 2, 3 on the phone) during the call. Useful for simple conversations without menu options.
              </p>
              <p className="text-sm font-medium">When to use:</p>
              <p className="text-sm text-muted-foreground">Enable this for direct conversations where you don't want phone menu navigation.</p>
            </div>
          </div>
        )
      }
    }
    return helpContents[section] || { title: "Help", content: "No help content available." }
  }

  if (!isMounted || loadingData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Send Call</h1>
            <p className="text-muted-foreground">Configure and send calls using the complete API</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHelpModalOpen('basic')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
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

                  {/* From Number Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="from">From Number *</Label>
                    <Select 
                      value={callData.from || ""} 
                      onValueChange={(value) => updateCallData('from', value)}
                    >
                      <SelectTrigger className="w-full" id="from">
                        <SelectValue placeholder="Select a number">
                          {callData.from || "Select a number"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-[200px] overflow-y-auto z-50" 
                        position="popper"
                        sideOffset={4}
                        avoidCollisions={true}
                      >
                        {purchasedNumbers.length === 0 ? (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            No numbers available. Please purchase a number first.
                          </div>
                        ) : (
                          purchasedNumbers.map((pn) => (
                            <SelectItem 
                              key={pn.id} 
                              value={pn.number}
                            >
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{pn.number}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {/* Show selected from number info */}
                    {callData.from && (
                      <p className="text-xs text-muted-foreground">
                        Caller ID: {callData.from}
                      </p>
                    )}
                  </div>

                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="voice">Voice</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={callData.voice || ""}
                        onValueChange={(value) => updateCallData('voice', value)}
                        disabled={voicesLoading || !!voicesError}
                      >
                        <SelectTrigger className="w-full" id="voice">
                          <SelectValue placeholder={voicesLoading ? "Loading voices..." : "Select a voice"}>
                            {selectedVoice ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white flex-shrink-0">
                                  {selectedVoice.name.charAt(0)}
                                </div>
                                <span>{selectedVoice.name}</span>
                                {selectedVoiceGenderEmoji ? (
                                  <span role="img" aria-label={selectedVoiceGenderEmoji.label}>
                                    {selectedVoiceGenderEmoji.emoji}
                                  </span>
                                ) : null}
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
                          {voices.map((voice) => {
                            const genderEmoji = getGenderEmoji(voice.gender)

                            return (
                              <SelectItem key={voice.id} value={voice.voiceId}>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white flex-shrink-0">
                                    {voice.name.charAt(0)}
                                  </div>
                                  <span>{voice.name}</span>
                                  {genderEmoji ? (
                                    <span role="img" aria-label={genderEmoji.label}>
                                      {genderEmoji.emoji}
                                    </span>
                                  ) : null}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!selectedVoice || loadingVoiceId === selectedVoice?.voiceId}
                        onClick={() => {
                          if (!selectedVoice) return
                          if (playingVoiceId === selectedVoice.voiceId) {
                            stopVoiceSample()
                          } else {
                            playVoiceSample(selectedVoice.voiceId, selectedVoice.name)
                          }
                        }}
                        title={selectedVoice ? "Preview voice" : "Select a voice to preview"}
                      >
                        {loadingVoiceId === selectedVoice?.voiceId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : playingVoiceId === selectedVoice?.voiceId ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {voicesError ? (
                      <p className="text-xs text-destructive">{voicesError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Select a voice and preview before sending.
                      </p>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHelpModalOpen('model')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHelpModalOpen('dispatch')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
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
                      <Label>Max Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={callData.max_duration || ""}
                        onChange={(e) => updateCallData('max_duration', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHelpModalOpen('audio')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHelpModalOpen('analysis')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHelpModalOpen('postCall')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHelpModalOpen('advanced')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
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

      {/* From Number Required Alert Modal */}
      <Dialog open={fromNumberAlertOpen} onOpenChange={setFromNumberAlertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <Phone className="h-5 w-5" />
              From Number Required
            </DialogTitle>
            <DialogDescription className="pt-2">
              Please select a purchased number in the <strong>From Number</strong> field before sending a call.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setFromNumberAlertOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}