"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { Search, RefreshCw } from "lucide-react"

interface CallLog {
  id: string
  callId: string
  userId: string
  userEmail: string
  userName: string
  toNumber: string
  fromNumber: string
  durationSeconds: number | null
  status: string
  costCents: number | null
  createdAt: string
  endedReason: string | null
  pathwayId: string | null
  phoneNumberDetail: string | null
}

export default function AdminCallLogsPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [userId, setUserId] = useState("")

  useEffect(() => {
    fetchCallLogs()
  }, [page])

  const fetchCallLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      })
      if (userId) {
        params.append("user_id", userId)
      }

      const response = await fetch(`/api/admin/call-logs?${params}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch call logs")
      }

      const data = await response.json()
      if (data.success) {
        setCallLogs(data.callLogs)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (err: any) {
      console.error("Error fetching call logs:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-"
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const handleSearch = () => {
    setPage(1)
    fetchCallLogs()
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Call Logs</h1>
        <p className="text-muted-foreground">View and filter all call logs</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Filter by user ID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-sm"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={fetchCallLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Call Logs</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${callLogs.length} calls`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs.length ? (
                  callLogs.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        {format(new Date(call.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{call.userName || call.userEmail}</div>
                          <div className="text-sm text-muted-foreground">{call.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{call.fromNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{call.toNumber}</TableCell>
                      <TableCell>{formatDuration(call.durationSeconds)}</TableCell>
                      <TableCell>
                        {call.costCents ? formatCurrency(call.costCents) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            call.status === "completed" ? "default" : "secondary"
                          }
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No call logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
