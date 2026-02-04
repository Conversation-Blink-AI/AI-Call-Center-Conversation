
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Play, Pause, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

interface Voice {
  id: string
  name: string
  description: string | null
  voiceId: string
  tags: string[]
  gender?: string | null
}

interface VoicesResponse {
  voices: Voice[]
  error?: string
}

export default function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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

      const response = await fetch("/api/voices")
      const data: VoicesResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch voices")
      }

      setVoices(data.voices || [])
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

  const playVoiceSample = async (voiceRowId: string, sampleVoiceId: string, voiceName: string) => {
    try {
      const voiceKey = voiceRowId
      const sampleId = sampleVoiceId

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      
      setPlayingVoiceId(null)
      setLoadingVoiceId(voiceKey)
      setLoadingProgress(prev => ({ ...prev, [voiceKey]: 0 }))
      setAudioError(null)

      // Dummy progress percentages to show if actual progress isn't available
      // Show only 99%
      let dummyProgressInterval: NodeJS.Timeout | null = null
      
      // Show 99% immediately
      setTimeout(() => {
        setLoadingProgress(prev => {
          const currentProgress = prev[voiceKey] || 0
          if (currentProgress < 10) {
            return { ...prev, [voiceKey]: 99 }
          }
          return prev
        })
      }, 200)

      console.log("🎵 [PLAY] Generating sample for voice:", sampleId, voiceName)

      const response = await fetch(`/api/bland-ai/voices/${sampleId}/sample`, {
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
              [voiceKey]: {
                current: prev[voiceKey]?.current || 0,
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
              setLoadingProgress(prev => ({ ...prev, [voiceKey]: progress }))
            }
          }
        }
        
        // Track timeupdate for both loading and playback progress
        audio.ontimeupdate = () => {
          // Track loading progress (buffering)
          if (audio.buffered.length > 0 && audio.duration > 0 && loadingVoiceId === voiceKey) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
            const progress = Math.round((bufferedEnd / audio.duration) * 100)
            if (progress > 0) {
              if (dummyProgressInterval) clearInterval(dummyProgressInterval)
              setLoadingProgress(prev => ({ ...prev, [voiceKey]: progress }))
            }
          }
          
          // Track playback progress (when playing) - directly use audio.currentTime and audio.duration
          if (playingVoiceId === voiceKey) {
            const currentTime = audio.currentTime || 0
            const duration = audio.duration || 0
            
            // Always update currentTime, even if duration is not available yet
            setPlaybackProgress(prev => {
              const prevDuration = prev[voiceKey]?.duration || 0
              const finalDuration = (duration > 0 && isFinite(duration)) ? duration : prevDuration
              
              if (currentTime > 0 || finalDuration > 0) {
                const progressPercent = finalDuration > 0 ? (currentTime / finalDuration) * 100 : 0
                console.log(`🎵 [PROGRESS] Voice ${voiceKey}: ${currentTime.toFixed(2)}s / ${finalDuration.toFixed(2)}s = ${progressPercent.toFixed(2)}%`)
                
                return {
                  ...prev,
                  [voiceKey]: {
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
          setLoadingProgress(prev => ({ ...prev, [voiceKey]: 100 }))
          setLoadingVoiceId(null)
          setPlayingVoiceId(voiceKey)
          // Initialize playback progress immediately
          setPlaybackProgress(prev => ({
            ...prev,
            [voiceKey]: {
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
              delete newProgress[voiceKey]
              return newProgress
            })
            setPlaybackProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[voiceKey]
              return newProgress
            })
          })
        }
        
        // Fallback to loadeddata if canplaythrough doesn't fire
        audio.onloadeddata = () => {
          if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or higher
            console.log("🎵 [AUDIO] Loaded, starting playback")
            if (dummyProgressInterval) clearInterval(dummyProgressInterval)
            setLoadingProgress(prev => ({ ...prev, [voiceKey]: 100 }))
            setLoadingVoiceId(null)
            setPlayingVoiceId(voiceKey)
            // Initialize playback progress immediately
            setPlaybackProgress(prev => ({
              ...prev,
              [voiceKey]: {
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
                delete newProgress[voiceKey]
                return newProgress
              })
              setPlaybackProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[voiceKey]
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
            delete newProgress[voiceKey]
            return newProgress
          })
          setPlaybackProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[voiceKey]
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
            delete newProgress[voiceKey]
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
                [voiceKey]: {
                  current: prev[voiceKey]?.current || 0,
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
              setLoadingProgress(prev => ({ ...prev, [voiceKey]: progress }))
              }
            }
          }
          
          // Track timeupdate for both loading and playback progress
          audio.ontimeupdate = () => {
            // Track loading progress (buffering)
            if (audio.buffered.length > 0 && audio.duration > 0 && loadingVoiceId === voiceKey) {
              const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
              const progress = Math.round((bufferedEnd / audio.duration) * 100)
              if (progress > 0) {
                if (dummyProgressInterval) clearInterval(dummyProgressInterval)
                setLoadingProgress(prev => ({ ...prev, [voiceKey]: progress }))
              }
            }
            
            // Track playback progress (when playing) - directly use audio.currentTime and audio.duration
            if (playingVoiceId === voiceKey) {
              const currentTime = audio.currentTime || 0
              const duration = audio.duration || 0
              
              // Always update currentTime, even if duration is not available yet
              setPlaybackProgress(prev => {
                const prevDuration = prev[voiceKey]?.duration || 0
                const finalDuration = (duration > 0 && isFinite(duration)) ? duration : prevDuration
                
                if (currentTime > 0 || finalDuration > 0) {
                  const progressPercent = finalDuration > 0 ? (currentTime / finalDuration) * 100 : 0
                  console.log(`🎵 [PROGRESS] Voice ${voiceKey}: ${currentTime.toFixed(2)}s / ${finalDuration.toFixed(2)}s = ${progressPercent.toFixed(2)}%`)
                  
                  return {
                    ...prev,
                    [voiceKey]: {
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
          setLoadingProgress(prev => ({ ...prev, [voiceKey]: 100 }))
            setLoadingVoiceId(null)
          setPlayingVoiceId(voiceKey)
            // Initialize playback progress immediately
            setPlaybackProgress(prev => ({
              ...prev,
            [voiceKey]: {
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
              delete newProgress[voiceKey]
                return newProgress
              })
              setPlaybackProgress(prev => {
                const newProgress = { ...prev }
              delete newProgress[voiceKey]
                return newProgress
              })
            })
          }
          
          // Fallback to loadeddata
          audio.onloadeddata = () => {
            if (audio.readyState >= 3) {
              console.log("🎵 [AUDIO] Loaded from URL, starting playback")
              if (dummyProgressInterval) clearInterval(dummyProgressInterval)
            setLoadingProgress(prev => ({ ...prev, [voiceKey]: 100 }))
              setLoadingVoiceId(null)
            setPlayingVoiceId(voiceKey)
              // Initialize playback progress immediately
              setPlaybackProgress(prev => ({
                ...prev,
              [voiceKey]: {
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
                delete newProgress[voiceKey]
                  return newProgress
                })
                setPlaybackProgress(prev => {
                  const newProgress = { ...prev }
                delete newProgress[voiceKey]
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
            delete newProgress[voiceKey]
              return newProgress
            })
            setPlaybackProgress(prev => {
              const newProgress = { ...prev }
            delete newProgress[voiceKey]
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
            delete newProgress[voiceKey]
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

  

  const getDescriptionDisplayText = (description: string | null | undefined) => {
    const text = String(description ?? "").trim()
    if (!text || text === "0") return ""
    return text
  }

  const getGenderEmoji = (gender?: string | null) => {
    const normalizedGender = String(gender ?? "").trim().toLowerCase()
    if (normalizedGender === "female") {
      return { emoji: "👩", label: "Female voice" }
    }
    if (normalizedGender === "male") {
      return { emoji: "👨", label: "Male voice" }
    }
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Voice Library</h1>
          <p className="text-muted-foreground">Loading voices...</p>
        </div>
        <Card className="border border-gray-200 dark:border-border shadow-sm">
          <CardContent className="space-y-4 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Voice Library</h1>
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

      {!error && (
        <>
          {voices.length === 0 ? (
            <Card className="border border-gray-200 dark:border-border shadow-sm">
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
            <Card className="border border-gray-200 dark:border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Available Voices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {voices.map((voice) => {
                    const descriptionText = getDescriptionDisplayText(voice.description)
                    const genderEmoji = getGenderEmoji(voice.gender)

                    return (
                      <div
                        key={voice.id}
                        className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>{voice.name?.charAt(0) ?? "V"}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold">{voice.name}</span>
                              {genderEmoji ? (
                                <span role="img" aria-label={genderEmoji.label}>
                                  {genderEmoji.emoji}
                                </span>
                              ) : null}
                            </div>
                            {descriptionText ? (
                              <p className="text-sm text-muted-foreground">{descriptionText}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                          <div className="flex flex-wrap gap-2">
                            {voice.tags.map((tag, index) => (
                              <Badge
                                key={`${voice.id}-${index}`}
                                variant="secondary"
                                className="bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800/50"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (playingVoiceId === voice.id) {
                                stopVoiceSample()
                              } else {
                                playVoiceSample(voice.id, voice.voiceId, voice.name)
                              }
                            }}
                            disabled={loadingVoiceId === voice.id}
                            className="h-8 px-2.5 bg-white dark:bg-gray-900 hover:bg-purple-600 hover:text-white border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
