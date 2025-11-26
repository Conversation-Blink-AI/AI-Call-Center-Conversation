"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Phone, Download, Play, Pause, FileText, ExternalLink, Calendar, Clock, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUserCallData } from "@/hooks/use-user-call-data"
import { useState, useRef, useEffect } from "react"

export default function CallHistoryPage() {
  const { calls, totalCalls, userPhoneNumber, loading, error, lastUpdated, refetch } = useUserCallData()
  const [pageSize, setPageSize] = useState("50")

  // Audio player state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({})
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>({})
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  // Audio player functions
  const handlePlayPause = (callId: string, recordingUrl: string) => {
    const audio = audioRefs.current[callId]

    if (!audio) {
      // Create new audio element if it doesn't exist
      const newAudio = new Audio(recordingUrl)
      audioRefs.current[callId] = newAudio

      // Set up event listeners
      newAudio.addEventListener('loadedmetadata', () => {
        setAudioDuration(prev => ({
          ...prev,
          [callId]: newAudio.duration
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
      "Pathway ID", "Ended Reason", "Recording URL", "Has Transcript", "Has Summary"
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
          call.recording_url || "",
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
          <p className="text-muted-foreground">View real-time call logs from Bland.ai</p>
          {userPhoneNumber && <p className="text-sm text-muted-foreground mt-1">Showing calls for: {userPhoneNumber}</p>}
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
                  Calls for {userPhoneNumber || "Loading..."}
                </CardTitle>
                <CardDescription>
                  {totalCalls} total calls • Page {currentPage} of {totalPages}
                  {lastUpdated && ` • Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
                </CardDescription>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading call history...</span>
            </div>
          ) : paginatedCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
              <p className="text-gray-600">
                {userPhoneNumber
                  ? "No calls have been made from this number yet."
                  : "Purchase a phone number to start making calls."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-auto max-h-[75vh] border rounded-lg">
                <div className="min-w-[1400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="font-semibold w-[130px] text-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            From
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold w-[130px] text-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            To
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold w-[110px] text-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Date
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold w-[100px] text-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Time
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold w-[80px] text-foreground">Duration</TableHead>
                        <TableHead className="font-semibold w-[110px] text-foreground">Status</TableHead>
                        <TableHead className="font-semibold w-[120px] text-foreground">Ended Reason</TableHead>
                        <TableHead className="font-semibold w-[200px] text-foreground">Pathway ID</TableHead>
                        <TableHead className="font-semibold w-[250px] text-foreground">Summary</TableHead>
                        <TableHead className="font-semibold w-[280px] text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCalls.map((call, index) => (
                        <TableRow key={call.id || index}>
                          <TableCell className="font-mono text-xs">
                            {call.from_number || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {call.to_number || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(call.start_time)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatTime(call.start_time)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatDuration(call.duration)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(call.status)}`}>
                              {call.status || "unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {call.ended_reason || call.outcome || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {call.pathway_id ? (
                              <div className="truncate max-w-[180px]" title={call.pathway_id}>
                                {call.pathway_id}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {call.summary ? (
                              <div className="truncate max-w-[200px]" title={call.summary}>
                                {call.summary}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {call.recording_url && (
                                <div className="flex items-center gap-2 min-w-[180px]">
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
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <div className="relative h-1 bg-gray-200 rounded-full cursor-pointer"
                                           onClick={(e) => {
                                             const rect = e.currentTarget.getBoundingClientRect()
                                             const clickX = e.clientX - rect.left
                                             const width = rect.width
                                             const duration = audioDuration[call.id] || 0
                                             const seekTime = (clickX / width) * duration
                                             handleSeek(call.id, seekTime)
                                           }}>
                                        <div 
                                          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
                                          style={{
                                            width: audioDuration[call.id] 
                                              ? `${((audioProgress[call.id] || 0) / audioDuration[call.id]) * 100}%`
                                              : '0%'
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono whitespace-nowrap">
                                      {formatAudioTime(audioProgress[call.id] || 0)} / {formatAudioTime(audioDuration[call.id] || 0)}
                                    </div>
                                  </div>
                                </div>
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

                              {call.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(call.id)
                                  }}
                                  title="Copy Call ID"
                                >
                                  <ExternalLink className="h-3 w-3" />
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
                    <span className="text-sm text-gray-600">
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
    </div>
  )
}