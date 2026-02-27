"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Phone, Download, Play, Pause, FileText, Calendar, Clock, Volume2, Gauge, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserCallData } from "@/hooks/use-user-call-data"
import { useState, useRef, useEffect } from "react"

// Three dots loading animation
const ThreeDotsLoader = () => (
  <span className="inline-flex items-center ml-1">
    <span className="inline-block w-1 h-1 bg-current rounded-full mx-0.5 dot-loader"></span>
    <span className="inline-block w-1 h-1 bg-current rounded-full mx-0.5 dot-loader" style={{ animationDelay: '0.2s' }}></span>
    <span className="inline-block w-1 h-1 bg-current rounded-full mx-0.5 dot-loader" style={{ animationDelay: '0.4s' }}></span>
  </span>
)

export default function CallHistoryPage() {
  const { calls, totalCalls, userPhoneNumber, loading, error, lastUpdated, refetch } = useUserCallData()
  const [pageSize, setPageSize] = useState("50")
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsData, setDetailsData] = useState<any | null>(null)
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  // Audio player state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({})
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>({})
  const [audioLoaded, setAudioLoaded] = useState<{ [key: string]: boolean }>({})
  const [playbackSpeed, setPlaybackSpeed] = useState<{ [key: string]: number }>({})
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  // Summary modal state
  const [selectedSummary, setSelectedSummary] = useState<{ id: string; summary: string } | null>(null)

  // Audio player functions
  const handlePlayPause = (callId: string, recordingUrl: string) => {
    const audio = audioRefs.current[callId]

    if (!audio) {
      // Create new audio element if it doesn't exist
      const newAudio = new Audio(recordingUrl)
      newAudio.preload = 'auto' // Preload the audio for better caching
      newAudio.playbackRate = playbackSpeed[callId] || 1.0 // Set default playback speed
      audioRefs.current[callId] = newAudio

      // Set up event listeners
      newAudio.addEventListener('loadedmetadata', () => {
        setAudioDuration(prev => ({
          ...prev,
          [callId]: newAudio.duration
        }))
      })

      newAudio.addEventListener('canplaythrough', () => {
        // Audio is fully downloaded and ready to play
        setAudioLoaded(prev => ({
          ...prev,
          [callId]: true
        }))
      })

      newAudio.addEventListener('timeupdate', () => {
        setAudioProgress(prev => ({
          ...prev,
          [callId]: newAudio.currentTime
        }))
      })

      newAudio.addEventListener('ended', () => {
        setCurrentlyPlaying(null)
        setAudioProgress(prev => ({
          ...prev,
          [callId]: 0
        }))
      })

      // Start playing
      newAudio.play()
      setCurrentlyPlaying(callId)
    } else {
      // Check if audio is already loaded
      if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
        setAudioLoaded(prev => ({
          ...prev,
          [callId]: true
        }))
      }

      // Apply playback speed if set
      if (playbackSpeed[callId]) {
        audio.playbackRate = playbackSpeed[callId]
      }

      // Toggle play/pause for existing audio
      if (currentlyPlaying === callId) {
        audio.pause()
        setCurrentlyPlaying(null)
      } else {
        // Pause other audios
        Object.values(audioRefs.current).forEach(otherAudio => {
          if (otherAudio !== audio) {
            otherAudio.pause()
          }
        })

        audio.play()
        setCurrentlyPlaying(callId)
      }
    }
  }

  const handleSeek = (callId: string, seekTime: number) => {
    const audio = audioRefs.current[callId]
    if (audio) {
      audio.currentTime = seekTime
      setAudioProgress(prev => ({
        ...prev,
        [callId]: seekTime
      }))
    }
  }

  const handlePlaybackSpeedChange = (callId: string, speed: number) => {
    const audio = audioRefs.current[callId]
    if (audio) {
      audio.playbackRate = speed
      setPlaybackSpeed(prev => ({
        ...prev,
        [callId]: speed
      }))
    }
  }

  const handleViewCallDetails = async (callId: string) => {
    if (!callId) return
    setIsDetailsOpen(true)
    setDetailsLoadingId(callId)
    setDetailsError(null)
    setDetailsData(null)

    try {
      const response = await fetch(`/api/bland-ai/calls/${encodeURIComponent(callId)}`, {
        method: "GET",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch call details")
      }

      setDetailsData(data)
    } catch (error: any) {
      setDetailsError(error?.message || "Failed to fetch call details")
    } finally {
      setDetailsLoadingId(null)
    }
  }


  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause()
        audio.src = ""
      })
    }
  }, [])

  // Pagination logic
  const currentPageSize = Number.parseInt(pageSize)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(totalCalls / currentPageSize)
  const startIndex = (currentPage - 1) * currentPageSize
  const endIndex = startIndex + currentPageSize
  const paginatedCalls = calls.slice(startIndex, endIndex)

  const formatDuration = (duration: number) => {
    if (!duration || isNaN(duration)) {
      return "0:00"
    }
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "Invalid Date"
      }
      return date.toLocaleDateString()
    } catch (error) {
      return "Invalid Date"
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "Invalid Time"
      }
      return date.toLocaleTimeString()
    } catch (error) {
      return "Invalid Time"
    }
  }

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "—"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "—"
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "complete":
        return "bg-green-100 text-green-700 border-green-200"
      case "failed":
      case "error":
        return "bg-red-100 text-red-700 border-red-200"
      case "busy":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "no-answer":
        return "bg-gray-100 text-gray-700 border-gray-200"
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200"
      default:
        return "bg-blue-100 text-blue-700 border-blue-200"
    }
  }

  const exportToCSV = () => {
    if (!calls.length) return

    const headers = [
      "Call ID", "From", "To", "Date", "Time", "Duration", "Status", 
      "Pathway ID", "Ended Reason", "Has Transcript", "Has Summary"
    ]

    const csvContent = [
      headers.join(","),
      ...calls.map((call) =>
        [
          call.id || "",
          call.from_number || "",
          call.to_number || "",
          formatDate(call.start_time),
          formatTime(call.start_time),
          formatDuration(call.duration),
          call.status || "",
          call.pathway_id || "",
          call.ended_reason || "",
          call.transcript ? "Yes" : "No",
          call.summary ? "Yes" : "No"
        ].map(field => `"${field}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `call-history-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call History</h1>
          <p className="text-muted-foreground">View real-time call logs</p>
          {userPhoneNumber && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Showing calls for:</span>
              <Badge variant="secondary" className="text-sm">{userPhoneNumber}</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={!calls.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">Error loading call history: {error}</p>
        </div>
      )}

      {/* No Phone Number State */}
      {!loading && !userPhoneNumber && (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-yellow-800 font-medium mb-2">No Phone Number Found</h3>
          <p className="text-yellow-700 text-sm mb-4">
            You need to purchase a phone number to start making calls and see call history.
          </p>
          <Button asChild size="sm">
            <a href="/dashboard/phone-numbers/purchase">Purchase Phone Number</a>
          </Button>
        </div>
      )}

      {/* Call History Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Calls for {userPhoneNumber || <ThreeDotsLoader />}
                </CardTitle>
                {!loading && (
                  <CardDescription>
                    {totalCalls} total calls • Page {currentPage} of {totalPages}
                    {lastUpdated && ` • Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
                  </CardDescription>
                )}
              </div>
            </div>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
                <SelectItem value="200">200 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : paginatedCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No calls found</h3>
              <p className="text-muted-foreground">
                {userPhoneNumber
                  ? "No calls have been made from this number yet."
                  : "Purchase a phone number to start making calls."}
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-visible">
                <div className="w-full">
                  <Table>
                    <TableHeader className="bg-card">
                      <TableRow>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            From
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            To
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Date
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Time
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap">Duration</TableHead>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap">Status</TableHead>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap">Ended Reason</TableHead>
                        <TableHead className="font-semibold text-foreground">Pathway ID</TableHead>
                        <TableHead className="font-semibold text-foreground">Conversation Summary</TableHead>
                        <TableHead className="font-semibold text-foreground whitespace-nowrap w-[200px]">Call Recordings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCalls.map((call, index) => (
                        <TableRow key={call.id || index}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {call.from_number || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {call.to_number || "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(call.start_time)}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatTime(call.start_time)}
                          </TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {formatDuration(call.duration)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(call.status)}`}>
                              {call.status || "unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {call.ended_reason || call.outcome || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono break-all max-w-[200px]">
                            {call.pathway_id || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                            {call.summary ? (
                              <div 
                                className="line-clamp-2 cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => setSelectedSummary({ id: call.id, summary: call.summary })}
                                title="Click to view full summary"
                              >
                                {call.summary}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap w-[200px]">
                            <div className="flex items-center gap-1 max-w-[200px]">
                              {call.recording_url && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 flex-shrink-0"
                                    onClick={() => handlePlayPause(call.id, call.recording_url)}
                                    title={currentlyPlaying === call.id ? "Pause Recording" : "Play Recording"}
                                  >
                                    {currentlyPlaying === call.id ? (
                                      <Pause className="h-3 w-3" />
                                    ) : (
                                      <Play className="h-3 w-3" />
                                    )}
                                  </Button>

                                  {/* Audio Progress Bar */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <div className="w-[50px] flex-shrink-0">
                                      <div 
                                        className="relative h-2 bg-gray-200 rounded-full"
                                        data-call-id={call.id}
                                      >
                                        <div 
                                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all"
                                          style={{
                                            width: audioDuration[call.id] 
                                              ? `${((audioProgress[call.id] || 0) / audioDuration[call.id]) * 100}%`
                                              : '0%'
                                          }}
                                        />
                                      </div>
                                    </div>
                                    {(currentlyPlaying === call.id || audioDuration[call.id] > 0) && (
                                      <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap flex-shrink-0 leading-tight">
                                        {formatAudioTime(audioProgress[call.id] || 0)}/{formatAudioTime(audioDuration[call.id] || 0)}
                                      </div>
                                    )}
                                    {/* Playback Speed Control */}
                                    {audioLoaded[call.id] && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 min-w-0"
                                            title={`Speed: ${playbackSpeed[call.id] || 1.0}x`}
                                          >
                                            <Gauge className="h-3 w-3" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-1" side="top" align="center">
                                          <div className="flex flex-col gap-0.5">
                                            {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                                              <Button
                                                key={speed}
                                                variant={playbackSpeed[call.id] === speed ? "default" : "ghost"}
                                                size="sm"
                                                className="h-6 px-2 text-xs justify-start"
                                                onClick={() => {
                                                  handlePlaybackSpeedChange(call.id, speed)
                                                }}
                                              >
                                                {speed}x
                                              </Button>
                                            ))}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  </div>
                                </div>
                              )}

                              {call.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleViewCallDetails(call.id)}
                                  title="View call details"
                                >
                                  <Info className="h-3 w-3" />
                                </Button>
                              )}

                              {call.transcript && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    const modal = document.createElement('div')
                                    modal.innerHTML = `
                                      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                        <div class="bg-white p-6 rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto m-4">
                                          <h3 class="text-lg font-semibold mb-4">Call Transcript</h3>
                                          <div class="text-sm text-gray-700 whitespace-pre-wrap border p-4 rounded bg-gray-50">${call.transcript}</div>
                                          <button onclick="this.closest('.fixed').remove()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
                                        </div>
                                      </div>
                                    `
                                    document.body.appendChild(modal)
                                  }}
                                  title="View Transcript"
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalCalls)} of {totalCalls} calls
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Modal */}
      <Dialog open={!!selectedSummary} onOpenChange={(open) => !open && setSelectedSummary(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversation Summary</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedSummary?.summary}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={(open) => !open && setIsDetailsOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {detailsLoadingId && (
              <p className="text-sm text-muted-foreground">Loading details...</p>
            )}
            {detailsError && (
              <p className="text-sm text-red-500">{detailsError}</p>
            )}
            {detailsData && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Call ID</p>
                    <p className="font-mono break-all">{detailsData.call_id || detailsData.c_id || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">From</p>
                    <p className="font-mono">{detailsData.from || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">To</p>
                    <p className="font-mono">{detailsData.to || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p>{detailsData.status || detailsData.queue_status || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Call Length (min)</p>
                    <p>{detailsData.call_length ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created At</p>
                    <p>{formatDateTime(detailsData.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Answered By</p>
                    <p>{detailsData.answered_by || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inbound</p>
                    <p>{typeof detailsData.inbound === "boolean" ? (detailsData.inbound ? "Yes" : "No") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transferred To</p>
                    <p className="font-mono break-all">{detailsData.transferred_to || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transferred At</p>
                    <p>{formatDateTime(detailsData.transferred_at)}</p>
                  </div>
                </div>

                <Tabs defaultValue="summary">
                  <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="request">Request Data</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
                    <TabsTrigger value="meta-capi">Meta CAPI Event</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailsData.summary || "No summary available."}
                    </p>
                  </TabsContent>

                  <TabsContent value="request">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {JSON.stringify(detailsData.request_data || {}, null, 2)}
                    </pre>
                  </TabsContent>

                  <TabsContent value="variables">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {JSON.stringify(detailsData.variables || {}, null, 2)}
                    </pre>
                  </TabsContent>

                  <TabsContent value="transcripts">
                    {Array.isArray(detailsData.transcripts) && detailsData.transcripts.length > 0 ? (
                      <div className="space-y-3">
                        {detailsData.transcripts.map((entry: any, idx: number) => (
                          <div key={entry.id || idx} className="rounded-md border border-border p-3 text-sm">
                            <p className="text-xs text-muted-foreground mb-1">
                              {entry.user || "speaker"} • {formatDateTime(entry.created_at)}
                            </p>
                            <p className="whitespace-pre-wrap">{entry.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No transcripts available.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="meta-capi">
                    <div className="rounded-md border border-border p-4 text-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Event Triggered</span>
                        <Badge variant="outline">
                          {typeof detailsData.meta_capi_event_triggered === "boolean"
                            ? detailsData.meta_capi_event_triggered ? "Yes" : "No"
                            : "—"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Event Name</p>
                        <p className="font-mono break-all">{detailsData.meta_capi_event_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Event ID</p>
                        <p className="font-mono break-all">{detailsData.meta_capi_event_id || "—"}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}