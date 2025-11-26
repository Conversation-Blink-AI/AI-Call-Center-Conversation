
"use client"

import { useState, useEffect, useMemo } from "react"
import { useUserCallData } from "@/hooks/use-user-call-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Phone, RefreshCcw, Download, Clock, Calendar, Search, Filter, SortAsc, SortDesc } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

type SortField = 'start_time' | 'duration' | 'status' | 'to_number' | 'from_number'
type SortDirection = 'asc' | 'desc'

export function CallHistoryClient({ phoneNumber }: { phoneNumber?: string }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>('start_time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(50)

  // Fetch call data using the optimized hook
  const { calls, loading, error, totalCalls, refetch, loadMore, hasMore, userPhoneNumber } = useUserCallData({
    limit: 1000, // Load more data for better filtering/sorting
    autoFetch: true,
  })

  // Filtered and sorted calls
  const filteredAndSortedCalls = useMemo(() => {
    let filtered = calls

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(call => 
        call.to_number?.toLowerCase().includes(searchLower) ||
        call.from_number?.toLowerCase().includes(searchLower) ||
        call.status?.toLowerCase().includes(searchLower) ||
        call.pathway_id?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(call => 
        call.status?.toLowerCase() === statusFilter.toLowerCase()
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle different data types
      if (sortField === 'start_time') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (sortField === 'duration') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      } else {
        aValue = String(aValue || '').toLowerCase()
        bValue = String(bValue || '').toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [calls, searchTerm, statusFilter, sortField, sortDirection])

  // Paginated calls for display
  const paginatedCalls = useMemo(() => {
    return filteredAndSortedCalls.slice(0, pageSize)
  }, [filteredAndSortedCalls, pageSize])

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    if (!seconds) return "00:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Format date to local date and time
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "complete":
      case "completed":
        return "bg-green-500"
      case "failed":
      case "error":
        return "bg-red-500"
      case "in-progress":
      case "in_progress":
      case "inprogress":
        return "bg-blue-500"
      case "queued":
      case "waiting":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredAndSortedCalls.length) return

    const headers = ["ID", "Date", "Time", "From", "To", "Duration", "Status", "Outcome", "Pathway ID"]
    const csvContent = [
      headers.join(","),
      ...filteredAndSortedCalls.map((call) =>
        [
          call.id,
          new Date(call.start_time).toLocaleDateString(),
          new Date(call.start_time).toLocaleTimeString(),
          call.from_number || '',
          call.to_number || '',
          formatDuration(call.duration),
          call.status || '',
          call.outcome || '',
          call.pathway_id || ''
        ].join(","),
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

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(calls.map(call => call.status?.toLowerCase()).filter(Boolean))
    return Array.from(statuses)
  }, [calls])

  // If no phone numbers are available
  if (!loading && !userPhoneNumber) {
    return (
      <div className="space-y-4">
        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
          <AlertTitle className="text-yellow-800">No Phone Number Found</AlertTitle>
          <AlertDescription className="text-yellow-700">
            You need to purchase a phone number to start making calls and see call history.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => (window.location.href = "/dashboard/phone-numbers/purchase")}>
            Purchase Phone Number
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {userPhoneNumber ? `Calls from: ${userPhoneNumber}` : "Loading phone number..."}
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={exportToCSV} disabled={!filteredAndSortedCalls.length}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search calls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">Show 25</SelectItem>
              <SelectItem value="50">Show 50</SelectItem>
              <SelectItem value="100">Show 100</SelectItem>
              <SelectItem value="500">Show 500</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error loading call history</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading && calls.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
            <CardDescription>Loading your call history...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[200px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call History
                </CardTitle>
                <CardDescription>
                  {filteredAndSortedCalls.length} of {totalCalls} calls • Showing {Math.min(pageSize, filteredAndSortedCalls.length)} results • Updated {new Date().toLocaleTimeString()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAndSortedCalls.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No calls found</h3>
                <p className="text-muted-foreground mt-2">
                  {searchTerm || statusFilter !== "all" 
                    ? "No calls match your current filters." 
                    : "No calls have been made from this number yet."}
                </p>
                {(searchTerm || statusFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[600px] w-full rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-[180px]">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('start_time')}
                            className="h-auto p-0 font-medium"
                          >
                            Date & Time
                            {sortField === 'start_time' && (
                              sortDirection === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('from_number')}
                            className="h-auto p-0 font-medium"
                          >
                            From
                            {sortField === 'from_number' && (
                              sortDirection === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('to_number')}
                            className="h-auto p-0 font-medium"
                          >
                            To
                            {sortField === 'to_number' && (
                              sortDirection === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('duration')}
                            className="h-auto p-0 font-medium"
                          >
                            Duration
                            {sortField === 'duration' && (
                              sortDirection === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('status')}
                            className="h-auto p-0 font-medium"
                          >
                            Status
                            {sortField === 'status' && (
                              sortDirection === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCalls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span>{new Date(call.start_time).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(call.start_time).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{call.from_number || "Unknown"}</TableCell>
                          <TableCell>{call.to_number || "Unknown"}</TableCell>
                          <TableCell>{formatDuration(call.duration)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(call.status)} variant="secondary">
                              {call.status || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {call.recording_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(call.recording_url, '_blank')}
                                >
                                  Audio
                                </Button>
                              )}
                              {call.transcript && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Could open a modal or expand to show transcript
                                    alert(call.transcript.substring(0, 200) + '...')
                                  }}
                                >
                                  Text
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Load More Button */}
                {filteredAndSortedCalls.length < totalCalls && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline" 
                      onClick={loadMore} 
                      disabled={loading}
                    >
                      {loading ? "Loading..." : `Load More (${totalCalls - calls.length} remaining)`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CallHistoryClient
