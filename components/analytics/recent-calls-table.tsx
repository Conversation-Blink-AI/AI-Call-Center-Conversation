"use client"

import { Fragment } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronRight, Phone, RefreshCcw, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatabaseCall {
  id: string
  call_id: string
  to_number: string
  from_number: string
  duration_seconds: number
  status: string
  recording_url?: string
  transcript?: string
  summary?: string
  cost_cents?: number
  pathway_id?: string
  ended_reason?: string
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
  phone_number_detail?: string
  meta_capi_status?: "fired" | "failed" | "not_fired"
}

export interface MetaCapiEvent {
  id: string
  call_id: string
  config_id: string
  event_name: string
  request_payload: unknown
  response_payload: unknown
  response_status?: number
  duration_ms?: number
  created_at: string
}

export interface MetaCapiState {
  loading: boolean
  error: string | null
  events: MetaCapiEvent[]
}

interface RecentCallsTableProps {
  calls: DatabaseCall[]
  expandedCallId: string | null
  metaCapiLogs: Record<string, MetaCapiState>
  onToggleExpand: (callId: string) => void
  onRefreshMetaCapi: (callId: string) => void
  onSyncCalls: () => void
  syncing?: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  metaCapiFilter: string
  onMetaCapiFilterChange: (value: string) => void
  formatDuration: (seconds: number) => string
  formatCost: (cents: number) => string
  formatDate: (dateString: string) => string
}

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase()
  const styles: Record<string, string> = {
    completed: "bg-primary/10 text-primary border-primary/20",
    failed: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200",
    busy: "bg-amber-100 text-amber-800 border-amber-200",
    "no-answer": "bg-slate-100 text-slate-700 border-slate-200",
  }
  const className = styles[normalized] ?? "bg-muted text-muted-foreground border-border"
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", className)}>
      {status}
    </Badge>
  )
}

function getMetaCapiBadge(status?: string) {
  switch (status) {
    case "fired":
      return (
        <Badge className="bg-emerald-600/90 hover:bg-emerald-600 text-white border-0">
          Fired
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="border-0">
          Failed
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Not Fired
        </Badge>
      )
  }
}

export function RecentCallsTable({
  calls,
  expandedCallId,
  metaCapiLogs,
  onToggleExpand,
  onRefreshMetaCapi,
  onSyncCalls,
  syncing = false,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  metaCapiFilter,
  onMetaCapiFilterChange,
  formatDuration,
  formatCost,
  formatDate,
}: RecentCallsTableProps) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-lg">Recent Calls</CardTitle>
            <CardDescription>
              Call data synced to your database — expand a row for details and Meta CAPI logs
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search phone number..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no-answer">No answer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={metaCapiFilter} onValueChange={onMetaCapiFilterChange}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Meta CAPI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Meta CAPI</SelectItem>
                <SelectItem value="fired">Fired</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="not_fired">Not Fired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Phone className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No calls match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting filters or sync the latest call data
            </p>
            <Button onClick={onSyncCalls} disabled={syncing} className="mt-4" variant="outline">
              <RefreshCcw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
              Sync Calls
            </Button>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead>Date</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Meta CAPI</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <Fragment key={call.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        expandedCallId === call.call_id && "bg-muted/60"
                      )}
                      onClick={() => onToggleExpand(call.call_id)}
                    >
                      <TableCell className="w-10 pr-0">
                        {expandedCallId === call.call_id ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(call.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">{call.to_number}</TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">{call.from_number}</TableCell>
                      <TableCell>{getStatusBadge(call.status)}</TableCell>
                      <TableCell>{getMetaCapiBadge(call.meta_capi_status)}</TableCell>
                      <TableCell className="text-sm">{formatDuration(call.duration_seconds)}</TableCell>
                      <TableCell className="text-sm">{formatCost(call.cost_cents ?? 0)}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm text-muted-foreground">
                        {call.ended_reason || "unknown"}
                      </TableCell>
                    </TableRow>
                    {expandedCallId === call.call_id && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={9} className="bg-muted/30 p-0">
                          <CallDetailPanel
                            call={call}
                            metaCapiState={metaCapiLogs[call.call_id]}
                            onRefresh={() => onRefreshMetaCapi(call.call_id)}
                            formatDuration={formatDuration}
                            formatDate={formatDate}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CallDetailPanel({
  call,
  metaCapiState,
  onRefresh,
  formatDuration,
  formatDate,
}: {
  call: DatabaseCall
  metaCapiState?: MetaCapiState
  onRefresh: () => void
  formatDuration: (seconds: number) => string
  formatDate: (dateString: string) => string
}) {
  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Call ID" value={call.call_id} mono />
        <DetailItem label="Duration" value={formatDuration(call.duration_seconds)} />
        <DetailItem label="Ended reason" value={call.ended_reason || "unknown"} />
        {call.start_time && <DetailItem label="Start time" value={formatDate(call.start_time)} />}
        {call.end_time && <DetailItem label="End time" value={formatDate(call.end_time)} />}
        {call.pathway_id && <DetailItem label="Pathway" value={call.pathway_id} mono />}
      </div>

      {call.summary && (
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <p className="text-sm leading-relaxed">{call.summary}</p>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Meta CAPI Events</p>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onRefresh() }}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {metaCapiState?.loading && (
          <p className="text-sm text-muted-foreground">Loading Meta CAPI logs...</p>
        )}

        {metaCapiState?.error && (
          <Alert variant="destructive">
            <AlertDescription>{metaCapiState.error}</AlertDescription>
          </Alert>
        )}

        {!metaCapiState?.loading && metaCapiState?.events?.length === 0 && (
          <p className="text-sm text-muted-foreground">No Meta CAPI events for this call yet.</p>
        )}

        <div className="space-y-3">
          {(metaCapiState?.events || []).map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    event.response_status && event.response_status < 300 ? "default" : "destructive"
                  }
                >
                  {event.response_status ? `HTTP ${event.response_status}` : "No response"}
                </Badge>
                <span className="text-muted-foreground">{event.event_name}</span>
                {event.duration_ms !== undefined && (
                  <span className="text-xs text-muted-foreground">{event.duration_ms}ms</span>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                  Request payload
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted/60 p-2 text-[10px]">
                  {JSON.stringify(event.request_payload, null, 2)}
                </pre>
              </details>
              <details className="group mt-2">
                <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                  Response payload
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted/60 p-2 text-[10px]">
                  {JSON.stringify(event.response_payload, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-sm font-medium", mono && "font-mono text-xs break-all")}>{value}</p>
    </div>
  )
}
