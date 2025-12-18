
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Mic, Globe, Lock, Play, Pause, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BlandVoice {
  id: string
  name: string
  description: string
  public: boolean
  tags: string[]
  average_rating?: number
  total_ratings?: number
}

interface VoicesResponse {
  voices: BlandVoice[]
  count: number
  total_available?: number
  error?: string
}

export default function VoicesPage() {
  const [voices, setVoices] = useState<BlandVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalAvailable, setTotalAvailable] = useState(0)
  
  // Audio preview states
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState<Record<string, number>>({})
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, { current: number; duration: number }>>({})
  const [audioError, setAudioError] = useState<string | null>(null)
  
  // Audio ref for controlling playback
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchVoices = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/bland-ai/voices")
      const data: VoicesResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch voices")
      }

      console.log("🎤 [VOICES] Received voices:", {
        count: data.voices.length,
        voice_ids: data.voices.map(v => ({ id: v.id, name: v.name })),
        total_available: data.total_available
      })

      // Filter out "0" from descriptions at the source - replace with null
      const cleanedVoices = data.voices.map((voice: BlandVoice) => {
        const desc = voice.description
        // Check all possible "0" cases and replace with null
        // Convert to string first to catch all cases
        const descStr = String(desc || "").trim()
        const cleanDesc = descStr.replace(/\s/g, '')
        
        if (
          desc === 0 || 
          desc === "0" || 
          desc == 0 ||
          descStr === "0" ||
          cleanDesc === "0" ||
          /^0+$/.test(cleanDesc) ||
          descStr === ""
        ) {
          return {
            ...voice,
            description: null as any // Set to null to ensure it's handled properly
          }
        }
        return voice
      })

      setVoices(cleanedVoices)
      setTotalAvailable(data.total_available || data.voices.length)
    } catch (err) {
      console.error("Error fetching voices:", err)
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      // Check if error contains 429 or "Too Many Requests"
      if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
        setError("Re-try. Something went wrong")
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const playVoiceSample = async (voiceId: string, voiceName: string) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      
      setPlayingVoiceId(null)
      setLoadingVoiceId(voiceId)
      setLoadingProgress(prev => ({ ...prev, [voiceId]: 0 }))
      setAudioError(null)

      // Dummy progress percentages to show if actual progress isn't available
      // Show only 99%
      let dummyProgressInterval: NodeJS.Timeout | null = null
      
      // Show 99% immediately
      setTimeout(() => {
        setLoadingProgress(prev => {
          const currentProgress = prev[voiceId] || 0
          if (currentProgress < 10) {
            return { ...prev, [voiceId]: 99 }
          }
          return prev
        })
      }, 200)

      console.log("🎵 [PLAY] Generating sample for voice:", voiceId, voiceName)

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
        const errorData = await response.json()
        // Check if it's a 429 error or contains "429" in the message
        if (response.status === 429 || errorData.error?.includes("429")) {
          throw new Error("Re-try. Something went wrong")
        }
        throw new Error(errorData.error || "Failed to generate voice sample")
      }

      // Check if response is direct audio or contains audio URL
      const contentType = response.headers.get("content-type")
      
      if (contentType && contentType.includes("audio")) {
        // Direct audio response
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Create and play audio
        const audio = new Audio(audioUrl)
        audioRef.current = audio
        
        // Track when duration becomes available
        audio.ondurationchange = () => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            setPlaybackProgress(prev => ({
              ...prev,
              [voiceId]: {
                current: prev[voiceId]?.current || 0,
                duration: audio.duration
              }
            }))
          }
        }
        
        // Track loading progress
        audio.onprogress = () => {
          if (audio.buffered.length > 0 && audio.duration > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
            const progress = Math.round((bufferedEnd / audio.duration) * 100)
            if (progress > 0) {
              if (dummyProgressInterval) clearInterval(dummyProgressInterval)
              setLoadingProgress(prev => ({ ...prev, [voiceId]: progress }))
            }
          }
        }
        
        // Track timeupdate for both loading and playback progress
        audio.ontimeupdate = () => {
          // Track loading progress (buffering)
          if (audio.buffered.length > 0 && audio.duration > 0 && loadingVoiceId === voiceId) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
            const progress = Math.round((bufferedEnd / audio.duration) * 100)
            if (progress > 0) {
              if (dummyProgressInterval) clearInterval(dummyProgressInterval)
              setLoadingProgress(prev => ({ ...prev, [voiceId]: progress }))
            }
          }
          
          // Track playback progress (when playing) - directly use audio.currentTime and audio.duration
          if (playingVoiceId === voiceId) {
            const currentTime = audio.currentTime || 0
            const duration = audio.duration || 0
            
            // Always update currentTime, even if duration is not available yet
            setPlaybackProgress(prev => {
              const prevDuration = prev[voiceId]?.duration || 0
              const finalDuration = (duration > 0 && isFinite(duration)) ? duration : prevDuration
              
              if (currentTime > 0 || finalDuration > 0) {
                const progressPercent = finalDuration > 0 ? (currentTime / finalDuration) * 100 : 0
                console.log(`🎵 [PROGRESS] Voice ${voiceId}: ${currentTime.toFixed(2)}s / ${finalDuration.toFixed(2)}s = ${progressPercent.toFixed(2)}%`)
                
                return {
                  ...prev,
                  [voiceId]: {
                    current: currentTime,
                    duration: finalDuration
                  }
                }
              }
              return prev
            })
          }
        }
        
        // Wait for audio to be ready to play (canplaythrough is better than loadeddata)
        audio.oncanplaythrough = () => {
          console.log("🎵 [AUDIO] Ready to play, starting playback")
          if (dummyProgressInterval) clearInterval(dummyProgressInterval)
          setLoadingProgress(prev => ({ ...prev, [voiceId]: 100 }))
          setLoadingVoiceId(null)
          setPlayingVoiceId(voiceId)
          // Initialize playback progress immediately
          setPlaybackProgress(prev => ({
            ...prev,
            [voiceId]: {
              current: 0,
              duration: (audio.duration && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : 0
            }
          }))
          audio.play().catch((err) => {
            console.error("🎵 [AUDIO] Play error:", err)
            if (dummyProgressInterval) clearInterval(dummyProgressInterval)
            setAudioError("Failed to play audio")
            setPlayingVoiceId(null)
            setLoadingVoiceId(null)
            setLoadingProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[voiceId]
              return newProgress
            })
            setPlaybackProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[voiceId]
              return newProgress
            })
          })
        }
        
        // Fallback to loadeddata if canplaythrough doesn't fire
        audio.onloadeddata = () => {
          if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or higher
            console.log("🎵 [AUDIO] Loaded, starting playback")
            if (dummyProgressInterval) clearInterval(dummyProgressInterval)
            setLoadingProgress(prev => ({ ...prev, [voiceId]: 100 }))
            setLoadingVoiceId(null)
            setPlayingVoiceId(voiceId)
            // Initialize playback progress immediately
            setPlaybackProgress(prev => ({
              ...prev,
              [voiceId]: {
                current: 0,
                duration: (audio.duration && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : 0
              }
            }))
            audio.play().catch((err) => {
              console.error("🎵 [AUDIO] Play error:", err)
              if (dummyProgressInterval) clearInterval(dummyProgressInterval)
              setAudioError("Failed to play audio")
              setPlayingVoiceId(null)
              setLoadingVoiceId(null)
              setLoadingProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[voiceId]
                return newProgress
              })
              setPlaybackProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[voiceId]
                return newProgress
              })
            })
          }
        }
        
        audio.onended = () => {
          console.log("🎵 [AUDIO] Playback ended")
          if (dummyProgressInterval) clearInterval(dummyProgressInterval)
          setPlayingVoiceId(null)
          setLoadingProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[voiceId]
            return newProgress
          })
          setPlaybackProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[voiceId]
            return newProgress
          })
          URL.revokeObjectURL(audioUrl)
        }
        
        audio.onerror = (e) => {
          console.error("🎵 [AUDIO] Playback error:", e)
          if (dummyProgressInterval) clearInterval(dummyProgressInterval)
          setAudioError("Failed to play audio sample")
          setPlayingVoiceId(null)
          setLoadingVoiceId(null)
          setLoadingProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[voiceId]
            return newProgress
          })
          URL.revokeObjectURL(audioUrl)
        }
        
        // Start loading the audio
        audio.load()
        
      } else {
        // JSON response with audio URL
        const data = await response.json()
        
        if (data.audio_url) {
          const audio = new Audio(data.audio_url)
          audioRef.current = audio
          
          // Track when duration becomes available
          audio.ondurationchange = () => {
            if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
              setPlaybackProgress(prev => ({
                ...prev,
                [voiceId]: {
                  current: prev[voiceId]?.current || 0,
                  duration: audio.duration
                }
              }))
            }
          }
          
          // Track loading progress
          audio.onprogress = () => {
            if (audio.buffered.length > 0 && audio.duration > 0) {
              const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
              const progress = Math.round((bufferedEnd / audio.duration) * 100)
              if (progress > 0) {
                if (dummyProgressInterval) clearInterval(dummyProgressInterval)
                setLoadingProgress(prev => ({ ...prev, [voiceId]: progress }))
              }
            }
          }
          
          // Track timeupdate for both loading and playback progress
          audio.ontimeupdate = () => {
            // Track loading progress (buffering)
            if (audio.buffered.length > 0 && audio.duration > 0 && loadingVoiceId === voiceId) {
              const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
              const progress = Math.round((bufferedEnd / audio.duration) * 100)
              if (progress > 0) {
                if (dummyProgressInterval) clearInterval(dummyProgressInterval)
                setLoadingProgress(prev => ({ ...prev, [voiceId]: progress }))
              }
            }
            
            // Track playback progress (when playing) - directly use audio.currentTime and audio.duration
            if (playingVoiceId === voiceId) {
              const currentTime = audio.currentTime || 0
              const duration = audio.duration || 0
              
              // Always update currentTime, even if duration is not available yet
              setPlaybackProgress(prev => {
                const prevDuration = prev[voiceId]?.duration || 0
                const finalDuration = (duration > 0 && isFinite(duration)) ? duration : prevDuration
                
                if (currentTime > 0 || finalDuration > 0) {
                  const progressPercent = finalDuration > 0 ? (currentTime / finalDuration) * 100 : 0
                  console.log(`🎵 [PROGRESS] Voice ${voiceId}: ${currentTime.toFixed(2)}s / ${finalDuration.toFixed(2)}s = ${progressPercent.toFixed(2)}%`)
                  
                  return {
                    ...prev,
                    [voiceId]: {
                      current: currentTime,
                      duration: finalDuration
                    }
                  }
                }
                return prev
              })
            }
          }
          
          // Wait for audio to be ready to play
          audio.oncanplaythrough = () => {
            console.log("🎵 [AUDIO] Ready to play from URL, starting playback")
            if (dummyProgressInterval) clearInterval(dummyProgressInterval)
            setLoadingProgress(prev => ({ ...prev, [voiceId]: 100 }))
            setLoadingVoiceId(null)
            setPlayingVoiceId(voiceId)
            // Initialize playback progress immediately
            setPlaybackProgress(prev => ({
              ...prev,
              [voiceId]: {
                current: 0,
                duration: (audio.duration && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : 0
              }
            }))
            audio.play().catch((err) => {
              console.error("🎵 [AUDIO] Play error:", err)
              if (dummyProgressInterval) clearInterval(dummyProgressInterval)
              setAudioError("Failed to play audio")
              setPlayingVoiceId(null)
              setLoadingVoiceId(null)
              setLoadingProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[voiceId]
                return newProgress
              })
              setPlaybackProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[voiceId]
                return newProgress
              })
            })
          }
          
          // Fallback to loadeddata
          audio.onloadeddata = () => {
            if (audio.readyState >= 3) {
              console.log("🎵 [AUDIO] Loaded from URL, starting playback")
              if (dummyProgressInterval) clearInterval(dummyProgressInterval)
              setLoadingProgress(prev => ({ ...prev, [voiceId]: 100 }))
              setLoadingVoiceId(null)
              setPlayingVoiceId(voiceId)
              // Initialize playback progress immediately
              setPlaybackProgress(prev => ({
                ...prev,
                [voiceId]: {
                  current: 0,
                  duration: (audio.duration && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : 0
                }
              }))
              audio.play().catch((err) => {
                console.error("🎵 [AUDIO] Play error:", err)
                if (dummyProgressInterval) clearInterval(dummyProgressInterval)
                setAudioError("Failed to play audio")
                setPlayingVoiceId(null)
                setLoadingVoiceId(null)
                setLoadingProgress(prev => {
                  const newProgress = { ...prev }
                  delete newProgress[voiceId]
                  return newProgress
                })
                setPlaybackProgress(prev => {
                  const newProgress = { ...prev }
                  delete newProgress[voiceId]
                  return newProgress
                })
              })
            }
          }
          
          audio.onended = () => {
            console.log("🎵 [AUDIO] Playback ended")
            if (dummyProgressInterval) clearInterval(dummyProgressInterval)
            setPlayingVoiceId(null)
            setLoadingProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[voiceId]
              return newProgress
            })
            setPlaybackProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[voiceId]
              return newProgress
            })
          }
          
          audio.onerror = (e) => {
            console.error("🎵 [AUDIO] Playback error:", e)
            if (dummyProgressInterval) clearInterval(dummyProgressInterval)
            setAudioError("Failed to play audio sample")
            setPlayingVoiceId(null)
            setLoadingVoiceId(null)
            setLoadingProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[voiceId]
              return newProgress
            })
          }
          
          // Start loading the audio
          audio.load()
        } else {
          throw new Error("No audio data received from API")
        }
      }

    } catch (err) {
      console.error("Error playing voice sample:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to play voice sample"
      // Check if error contains 429 or "Too Many Requests"
      if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
        setAudioError("Re-try. Something went wrong")
      } else {
        setAudioError(errorMessage)
      }
      setLoadingVoiceId(null)
      setPlayingVoiceId(null)
    }
  }

  const stopVoiceSample = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoiceId(null)
    setLoadingProgress({})
  }

  // Auto-hide error messages after 1 second
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Auto-hide audio error messages after 1 second
  useEffect(() => {
    if (audioError) {
      const timer = setTimeout(() => {
        setAudioError(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [audioError])

  useEffect(() => {
    fetchVoices()
  }, [])

  

  const getTagColor = (tag: string) => {
    const lowerTag = tag.toLowerCase()
    if (lowerTag.includes("male") || lowerTag.includes("female")) return "bg-pink-50 dark:bg-gray-900 text-pink-600 dark:text-pink-300 border-pink-200 dark:border-pink-700/50"
    if (lowerTag.includes("english") || lowerTag.includes("spanish") || lowerTag.includes("language"))
      return "bg-blue-50 dark:bg-gray-900 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-700/50"
    if (lowerTag.includes("young") || lowerTag.includes("old") || lowerTag.includes("age"))
      return "bg-green-50 dark:bg-gray-900 text-green-600 dark:text-green-300 border-green-200 dark:border-green-700/50"
    return "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700/50"
  }

  const shouldDisplayDescription = (description: any): boolean => {
    // Early return for null/undefined
    if (description == null || description === undefined) return false
    
    // Check for zero values (number or string) - strict equality first
    if (description === 0 || description === "0") return false
    
    // Convert to string and trim
    const descStr = String(description).trim()
    
    // Remove all whitespace for zero-checking
    const cleanDesc = descStr.replace(/\s/g, '')
    
    // Check for empty, zero, or invalid values
    if (cleanDesc === "" || cleanDesc === "0" || cleanDesc === "null" || cleanDesc === "undefined") return false
    
    // Check if it's only zeros (any number of zeros)
    if (/^0+$/.test(cleanDesc)) return false
    
    // Additional check: if description is just "0" (already covered above, but being explicit)
    if (cleanDesc === "0") return false
    
    // If we get here and the original trimmed string is empty, don't show
    if (descStr === "") return false
    
    return true
  }

  // Helper function to get display text for description, replacing "0" with "-"
  const getDescriptionDisplayText = (description: any): string => {
    // Handle null/undefined
    if (description == null || description === undefined) {
      return "-"
    }
    
    // Handle number 0 or string "0" - check both strict and loose equality
    if (description === 0 || description === "0" || description == 0 || description == "0") {
      return "-"
    }
    
    // Convert to string and clean
    const desc = String(description).trim()
    
    // If empty after trim, return "-"
    if (desc === "") {
      return "-"
    }
    
    // Remove all whitespace for zero-checking
    const cleanDesc = desc.replace(/\s/g, '')
    
    // Replace "0" or empty or all zeros with "-"
    if (cleanDesc === "0" || cleanDesc === "" || /^0+$/.test(cleanDesc)) {
      return "-"
    }
    
    // Final check: if the original string is just "0" (with or without spaces)
    if (desc === "0" || desc.replace(/\s/g, '') === "0") {
      return "-"
    }
    
    return desc
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Voice Library</h1>
          <p className="text-muted-foreground">
            Loading voices...
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white dark:bg-gradient-to-br dark:from-[hsl(235_25%_15%)] dark:to-[hsl(235_25%_18%)] border border-gray-200 dark:border-border shadow-sm">
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 h-screen overflow-hidden flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-foreground mb-2">Voice Library</h1>
        <p className="text-muted-foreground">
          Top rated voices + Indian voices from {totalAvailable} available voices
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span>{error}</span>
          </AlertDescription>
        </Alert>
      )}

      {audioError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span>{audioError}</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {!error && (
          <>
            

            <div className="flex-1 overflow-y-auto scrollbar-smooth pr-2">
              {voices.length === 0 ? (
                <Card className="bg-white dark:bg-gradient-to-br dark:from-[hsl(235_25%_15%)] dark:to-[hsl(235_25%_18%)] border border-gray-200 dark:border-border shadow-sm">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <div className="text-6xl mx-auto mb-4">🗣️</div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
                        No voices available
                      </h3>
                      <p className="text-gray-600 dark:text-muted-foreground">
                        There are no voices available at the moment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="voice-cards-grid grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-6">
                  {voices.map((voice) => (
                    <Card key={voice.id} className="group relative overflow-hidden bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 dark:bg-gradient-to-br dark:from-[hsl(235_25%_15%)] dark:to-[hsl(235_25%_18%)] border border-gray-200 dark:border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-gradient-to-br hover:from-blue-50/40 hover:via-white hover:to-purple-50/30 hover:dark:bg-[hsl(235_25%_15%)]/70 hover:backdrop-blur-lg hover:shadow-2xl hover:shadow-gray-200/60 dark:hover:shadow-purple-900/30 hover:border-gray-300 dark:hover:border-purple-400/60 hover:border-glow hover:glow-animate">
                      {/* Glassmorphic overlay effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-purple-500/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]"></div>
                      <CardHeader className="pb-4 relative z-10">
                        {/* Heading on single line */}
                        <CardTitle className="text-lg font-semibold capitalize flex items-center text-gray-900 dark:text-foreground whitespace-nowrap overflow-hidden">
                          <span className="mr-2 text-xl">🗣️</span>
                          <span className="truncate">{voice.name}</span>
                        </CardTitle>
                        {/* Actions on next line */}
                        <div className="flex items-center space-x-2 mt-3">
                          {voice.average_rating && voice.average_rating > 0 && (
                            <Badge variant="outline" className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:bg-gradient-to-r dark:from-amber-900/50 dark:via-yellow-900/40 dark:to-amber-900/50 text-amber-700 dark:text-amber-200 border-amber-300 dark:border-amber-500/60 dark:shadow-lg dark:shadow-amber-900/30 font-medium">
                              ⭐ {voice.average_rating.toFixed(1)}
                            </Badge>
                          )}
                          <Badge variant={voice.public ? "default" : "secondary"} className={`flex items-center font-medium shadow-sm ${voice.public ? 'bg-gradient-to-r from-purple-400 to-purple-500 dark:from-purple-500 dark:to-purple-600 text-white border-0' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                            {voice.public ? (
                              <>
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </>
                            )}
                          </Badge>
                          {/* Voice Preview Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (playingVoiceId === voice.id) {
                                stopVoiceSample()
                              } else {
                                playVoiceSample(voice.id, voice.name)
                              }
                            }}
                            disabled={loadingVoiceId === voice.id}
                            className="h-8 px-2.5 bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br dark:from-gray-700/80 dark:to-gray-800/90 hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 text-gray-600 dark:text-gray-100 border border-gray-200 dark:border-gray-600/60 dark:shadow-md hover:shadow-md hover:text-white hover:border-transparent dark:hover:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            title={playingVoiceId === voice.id ? "Stop preview" : "Play preview"}
                          >
                            {loadingVoiceId === voice.id ? (
                              <div className="flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs font-medium">
                                  {loadingProgress[voice.id] || 0}%
                                </span>
                              </div>
                            ) : playingVoiceId === voice.id ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {(() => {
                          // Get the raw description value directly
                          const rawDesc = voice.description
                          
                          // IMMEDIATE check - if it's 0 or "0" in any form, don't render anything
                          if (rawDesc === 0 || rawDesc === "0" || rawDesc == 0 || rawDesc === null || rawDesc === undefined) {
                            return null
                          }
                          
                          // Convert to string immediately
                          const descStr = String(rawDesc || "").trim()
                          
                          // Check if it's "0" after string conversion - don't render if so
                          if (descStr === "0" || descStr.replace(/\s/g, '') === "0" || /^0+$/.test(descStr.replace(/\s/g, '')) || descStr === "") {
                            return null
                          }
                          
                          // Use helper function as additional layer
                          let displayText = getDescriptionDisplayText(rawDesc)
                          
                          // Convert to string and ensure it's never "0"
                          displayText = String(displayText || "").trim()
                          
                          // FINAL absolute check - don't render if it's "0" or empty
                          if (displayText === "0" || displayText.replace(/\s/g, '') === "0" || displayText === "" || displayText === "-") {
                            return null
                          }
                          
                          // Only render if there's actual content
                          return (
                            <div className="text-sm text-gray-600 dark:text-muted-foreground mt-3 font-medium">{displayText}</div>
                          )
                        })()}
                        {voice.total_ratings &&
                         typeof voice.total_ratings === 'number' &&
                         voice.total_ratings > 0 ? (
                          <div className="text-xs text-gray-500 dark:text-muted-foreground mt-2">
                            Based on {voice.total_ratings} rating{voice.total_ratings !== 1 ? 's' : ''}
                          </div>
                        ) : null}
                      </CardHeader>
                      <CardContent className="pt-2 relative z-10">
                        {voice.tags && voice.tags.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-muted-foreground uppercase tracking-wider mb-3 block">
                              Tags
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {voice.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className={`text-xs font-medium shadow-sm ${getTagColor(tag)}`}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
