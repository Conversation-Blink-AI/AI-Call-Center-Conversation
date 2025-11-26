
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Mic, Globe, Lock, Play, Pause, Loader2 } from "lucide-react"
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

      setVoices(data.voices)
      setTotalAvailable(data.total_available || data.voices.length)
    } catch (err) {
      console.error("Error fetching voices:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
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
      setAudioError(null)

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
        
        audio.onloadeddata = () => {
          console.log("🎵 [AUDIO] Loaded, starting playback")
          setLoadingVoiceId(null)
          setPlayingVoiceId(voiceId)
          audio.play()
        }
        
        audio.onended = () => {
          console.log("🎵 [AUDIO] Playback ended")
          setPlayingVoiceId(null)
          URL.revokeObjectURL(audioUrl)
        }
        
        audio.onerror = (e) => {
          console.error("🎵 [AUDIO] Playback error:", e)
          setAudioError("Failed to play audio sample")
          setPlayingVoiceId(null)
          setLoadingVoiceId(null)
          URL.revokeObjectURL(audioUrl)
        }
        
      } else {
        // JSON response with audio URL
        const data = await response.json()
        
        if (data.audio_url) {
          const audio = new Audio(data.audio_url)
          audioRef.current = audio
          
          audio.onloadeddata = () => {
            console.log("🎵 [AUDIO] Loaded from URL, starting playback")
            setLoadingVoiceId(null)
            setPlayingVoiceId(voiceId)
            audio.play()
          }
          
          audio.onended = () => {
            console.log("🎵 [AUDIO] Playback ended")
            setPlayingVoiceId(null)
          }
          
          audio.onerror = (e) => {
            console.error("🎵 [AUDIO] Playback error:", e)
            setAudioError("Failed to play audio sample")
            setPlayingVoiceId(null)
            setLoadingVoiceId(null)
          }
        } else {
          throw new Error("No audio data received from API")
        }
      }

    } catch (err) {
      console.error("Error playing voice sample:", err)
      setAudioError(err instanceof Error ? err.message : "Failed to play voice sample")
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
  }

  useEffect(() => {
    fetchVoices()
  }, [])

  

  const getTagColor = (tag: string) => {
    const lowerTag = tag.toLowerCase()
    if (lowerTag.includes("male") || lowerTag.includes("female")) return "bg-pink-100 text-pink-700"
    if (lowerTag.includes("english") || lowerTag.includes("spanish") || lowerTag.includes("language"))
      return "bg-blue-100 text-blue-700"
    if (lowerTag.includes("young") || lowerTag.includes("old") || lowerTag.includes("age"))
      return "bg-green-100 text-green-700"
    return "bg-gray-100 text-gray-700"
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white shadow-sm animate-pulse">
              <CardHeader className="pb-4">
                <div className="h-6 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                  <div className="h-6 w-20 bg-gray-200 rounded" />
                  <div className="h-6 w-14 bg-gray-200 rounded" />
                </div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Library</h1>
        <p className="text-gray-600">
          Top rated voices + Indian voices from {totalAvailable} available voices
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVoices}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {audioError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{audioError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAudioError(null)}
              className="ml-4"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {!error && (
          <>
            

            <div className="flex-1 overflow-y-auto scrollbar-smooth pr-2">
              {voices.length === 0 ? (
                <Card className="bg-white shadow-sm">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <div className="text-6xl mx-auto mb-4">🗣️</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No voices available
                      </h3>
                      <p className="text-gray-500">
                        There are no voices available at the moment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-6">
                  {voices.map((voice) => (
                    <Card key={voice.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold capitalize flex items-center">
                            <span className="mr-2 text-blue-600">🗣️</span>
                            {voice.name}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
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
                              className="h-8 w-8 p-0"
                              title={playingVoiceId === voice.id ? "Stop preview" : "Play preview"}
                            >
                              {loadingVoiceId === voice.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : playingVoiceId === voice.id ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                            
                            {voice.average_rating && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                ⭐ {voice.average_rating.toFixed(1)}
                              </Badge>
                            )}
                            <Badge variant={voice.public ? "default" : "secondary"} className="flex items-center">
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
                          </div>
                        </div>
                        <CardDescription className="text-sm text-gray-600 mt-2">
                          {voice.description}
                        </CardDescription>
                        {voice.total_ratings && (
                          <div className="text-xs text-gray-500 mt-1">
                            Based on {voice.total_ratings} rating{voice.total_ratings !== 1 ? 's' : ''}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {voice.tags && voice.tags.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                              Tags
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {voice.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className={`text-xs ${getTagColor(tag)}`}
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
