"use client"

import { useState, useEffect, Fragment } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Phone, 
  Clock, 
  DollarSign, 
  RefreshCcw, 
  Download, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  PhoneCall,
  Timer,
  Wallet,
  BarChart3,
  PieChart,
  Calendar,
  CreditCard,
  CheckCircle,
  X,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"

interface CallStats {
  totalCalls: number
  completedCalls: number
  failedCalls: number
  transferredCalls: number
  totalDuration: number
  totalCost: number
  averageDuration: number
  successRate: number
  transferLeadsRate: number
  averageCostPerCall: number
  callsThisWeek: number
  callsThisMonth: number
  costThisWeek: number
  costThisMonth: number
  volumeSeries: { date: string; count: number }[]
  transferLeadsSeries: { date: string; count: number }[]
}

interface DatabaseCall {
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
}

interface MetaCapiEvent {
  id: string
  call_id: string
  config_id: string
  event_name: string
  request_payload: any
  response_payload: any
  response_status?: number
  duration_ms?: number
  created_at: string
}

interface MetaCapiState {
  loading: boolean
  error: string | null
  events: MetaCapiEvent[]
}

interface TimeframeCounts {
  today: number
  yesterday: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
}

interface BillingStats {
  totalBilledCalls: number
  totalSpentCents: number
  unbilledCalls: number
  estimatedUnbilledCostCents: number
}

export default function CallsPage() {
  const { user } = useAuth()
  const [calls, setCalls] = useState<DatabaseCall[]>([])
  const [callStats, setCallStats] = useState<CallStats | null>(null)
  const [timeframeCounts, setTimeframeCounts] = useState<TimeframeCounts | null>(null)
  // Removed billingStats as it's no longer relevant for manual billing
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  // Removed billing state and related functions
  const [timeframe, setTimeframe] = useState("7d")
  const [chartMetric, setChartMetric] = useState("volume")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  const [metaCapiLogs, setMetaCapiLogs] = useState<Record<string, MetaCapiState>>({})
  const [showMetaCapiPanel, setShowMetaCapiPanel] = useState(false)

  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<string>("$0.00")
  const [walletLoading, setWalletLoading] = useState(false)


  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!user?.id) return

    setWalletLoading(true)
    try {
      const response = await fetch('/api/wallet/balance', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const balanceInDollars = (data.balance_cents / 100).toFixed(2)
        setWalletBalance(`$${balanceInDollars}`)
        console.log('✅ Balance fetched:', balanceInDollars)
      } else {
        console.error('Failed to fetch wallet balance')
        setWalletBalance("$0.00")
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
      setWalletBalance("$0.00")
    } finally {
      setWalletLoading(false)
    }
  }

  const fetchCalls = async () => {
    if (!user?.id) return

    try {
      setError(null)
      // Fetch calls from database
      const callsResponse = await fetch(`/api/calls/database?userId=${user.id}&limit=50&offset=${(page - 1) * 50}&timeframe=${timeframe}`, {
        credentials: 'include'
      })
      
      if (callsResponse.ok) {
        const callsData = await callsResponse.json()
        setCalls(callsData.calls || [])
        setTotalPages(Math.ceil((callsData.total || 0) / 50))
      } else {
        const errorData = await callsResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${callsResponse.status}: Failed to fetch calls`
        console.error('Error fetching calls:', errorMessage, errorData)
        
        // Only set error for actual failures, not for empty data
        if (callsResponse.status >= 500) {
          setError(`Server error: ${errorMessage}`)
        } else if (callsResponse.status === 401 || callsResponse.status === 403) {
          setError('Authentication error: Please refresh the page and try again')
        } else {
          // For other errors (like 400), just log but don't block the UI
          console.warn('Non-critical error fetching calls:', errorMessage)
          setCalls([])
          setTotalPages(1)
        }
      }
    } catch (error: any) {
      console.error('Error fetching calls:', error)
      // Only show error for network errors or unexpected failures
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setError('Network error: Please check your connection and try again')
      } else {
        // For other errors, just set empty data
        setCalls([])
        setTotalPages(1)
      }
    }
  }

  const fetchMetaCapiEvents = async (callId: string) => {
    setMetaCapiLogs((prev) => ({
      ...prev,
      [callId]: { loading: true, error: null, events: prev[callId]?.events || [] }
    }))

    try {
      const response = await fetch(`/api/meta-capi/events?call_id=${encodeURIComponent(callId)}`, {
        credentials: "include"
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to fetch Meta CAPI events")
      }

      setMetaCapiLogs((prev) => ({
        ...prev,
        [callId]: { loading: false, error: null, events: result.events || [] }
      }))
    } catch (fetchError: any) {
      setMetaCapiLogs((prev) => ({
        ...prev,
        [callId]: { loading: false, error: fetchError.message || "Failed to fetch Meta CAPI events", events: [] }
      }))
    }
  }

  const handleToggleMetaCapi = (callId: string) => {
    const nextExpanded = expandedCallId === callId ? null : callId
    setExpandedCallId(nextExpanded)
    if (nextExpanded && !metaCapiLogs[callId]) {
      fetchMetaCapiEvents(callId)
    }
  }

  const fetchCallStats = async () => {
    if (!user?.id) return

    try {
      // Fetch enhanced stats
      const statsResponse = await fetch(`/api/calls/stats?userId=${user.id}&timeframe=${timeframe}`, {
        credentials: 'include'
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setCallStats(statsData.stats)
        setTimeframeCounts(statsData.timeframeCounts)
      } else {
        const errorData = await statsResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${statsResponse.status}: Failed to fetch stats`
        console.error('Error fetching call stats:', errorMessage, errorData)
        
        // Only set error for actual failures, not for empty data
        if (statsResponse.status >= 500) {
          // Don't overwrite existing error if it's more critical
          setError(prev => prev || `Server error: ${errorMessage}`)
        } else if (statsResponse.status === 401 || statsResponse.status === 403) {
          setError('Authentication error: Please refresh the page and try again')
        } else {
          // For other errors (like 400), just log but don't block the UI
          console.warn('Non-critical error fetching stats:', errorMessage)
          // Set default empty stats instead of blocking
          setCallStats(null)
          setTimeframeCounts(null)
        }
      }
    } catch (error: any) {
      console.error('Error fetching call stats:', error)
      // Only show error for network errors or unexpected failures
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setError(prev => prev || 'Network error: Please check your connection and try again')
      } else {
        // For other errors, just set empty stats
        setCallStats(null)
        setTimeframeCounts(null)
      }
    }
  }

  const syncCalls = async (showToast = true) => {
    if (!user?.id || syncing) return

    try {
      setSyncing(true)
      // Only clear error if this is a manual sync (user-initiated)
      if (showToast) {
        setError(null)
      }

      const response = await fetch('/api/calls/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || 'Failed to sync calls'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      if (showToast) {
        toast.success(result.message || 'Calls synced successfully')
      }
      console.log('Sync result:', result)

      // Refresh all data after sync
      await Promise.all([
        fetchCalls(),
        fetchCallStats(),
        fetchWalletBalance()
      ])

      return result

    } catch (error: any) {
      console.error('Sync error:', error)
      // Only show error/toast for manual syncs (user-initiated)
      if (showToast) {
        toast.error(error.message || 'Failed to sync calls')
        setError('Failed to sync calls')
      } else {
        // For auto-sync, just log the error but don't block the UI
        console.warn('⚠️ [CALLS-PAGE] Auto-sync failed silently:', error.message)
      }
      throw error
    } finally {
      setSyncing(false)
    }
  }

  // Removed processPendingBills function as manual billing is no longer supported

  useEffect(() => {
    if (user?.id) {
      setLoading(true)
      // Auto-sync on page load, then fetch data
      const initializeData = async () => {
        try {
          console.log('🔄 [CALLS-PAGE] Auto-syncing on page load...')
          // Auto-sync calls first (without toast to avoid spam)
          await syncCalls(false)
        } catch (error) {
          console.warn('⚠️ [CALLS-PAGE] Auto-sync failed, continuing with cached data:', error)
        } finally {
          // Always fetch data regardless of sync success
          Promise.all([
            fetchCalls(),
            fetchCallStats(),
            fetchWalletBalance()
          ]).finally(() => {
            setLoading(false)
          })
        }
      }

      initializeData()
    }
  }, [user?.id, timeframe, page]) // Added page dependency


  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatCost = (cents: number) => {
    if (!cents) return '$0.00'
    return `$${(cents / 100).toFixed(2)}`
  }

  const getStatusBadge = (status: string) => {
    const variant = status === 'completed' ? 'default' : 
                   status === 'failed' ? 'destructive' : 'secondary'
    return <Badge variant={variant}>{status}</Badge>
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const volumeData = callStats?.volumeSeries?.map((item) => ({
    date: item.date,
    label: new Date(item.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    }),
    count: item.count
  })) || []

  const transferLeadsData = callStats?.transferLeadsSeries?.map((item) => ({
    date: item.date,
    label: new Date(item.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    }),
    count: item.count
  })) || []

  const chartData = chartMetric === "transfers" ? transferLeadsData : volumeData
  const chartTitle = chartMetric === "transfers" ? "Transfer Leads" : "Call Volume"

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">View and manage your synced call data from the database</p>
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
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">View and manage your synced call data from the database</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={(value) => { setTimeframe(value); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last day</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => syncCalls(true)} disabled={syncing} variant="outline">
            <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="pr-8">{error}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Analytics Cards */}
      {callStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{callStats.totalCalls}</div>
              {timeframeCounts && (
                <div className="flex items-center text-[11px] text-muted-foreground">
                  <span>This week: {timeframeCounts.thisWeek}</span>
                  {timeframeCounts.lastWeek > 0 && (
                    <>
                      <span className="mx-1">•</span>
                      {calculateGrowth(timeframeCounts.thisWeek, timeframeCounts.lastWeek) >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span>{Math.abs(calculateGrowth(timeframeCounts.thisWeek, timeframeCounts.lastWeek)).toFixed(1)}%</span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Transfer Leads</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{callStats.transferLeadsRate.toFixed(1)}%</div>
              <div className="text-[11px] text-muted-foreground">
                {callStats.transferredCalls} transferred, {callStats.totalCalls} total
              </div>
            </CardContent>
          </Card>

          <Card
            className="shadow-sm cursor-pointer hover:border-primary/40 transition"
            onClick={() => setShowMetaCapiPanel((prev) => !prev)}
            role="button"
            aria-pressed={showMetaCapiPanel}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Meta CAPI</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{showMetaCapiPanel ? "Open" : "View"}</div>
              <div className="text-[11px] text-muted-foreground">
                Click to {showMetaCapiPanel ? "hide" : "show"} logs
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{formatDuration(callStats.totalDuration)}</div>
              <div className="text-[11px] text-muted-foreground">
                Avg: {formatDuration(callStats.averageDuration)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{formatCost(callStats.totalCost)}</div>
              <div className="text-[11px] text-muted-foreground">
                Avg: {formatCost(callStats.averageCostPerCall)} per call
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showMetaCapiPanel && (
        <Card>
          <CardHeader>
            <CardTitle>Meta CAPI Logs</CardTitle>
            <CardDescription>Expand a call to view Meta response details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {calls.length === 0 && (
              <div className="text-sm text-muted-foreground">No calls available yet.</div>
            )}
            {calls.slice(0, 10).map((call) => (
              <div key={call.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{call.call_id}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(call.created_at)}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleToggleMetaCapi(call.call_id)}>
                    {expandedCallId === call.call_id ? "Hide" : "Expand"}
                  </Button>
                </div>
                {expandedCallId === call.call_id && (
                  <div className="mt-3 space-y-3 text-sm">
                    {metaCapiLogs[call.call_id]?.loading && (
                      <div className="text-muted-foreground">Loading Meta CAPI logs...</div>
                    )}

                    {metaCapiLogs[call.call_id]?.error && (
                      <Alert variant="destructive">
                        <AlertDescription>{metaCapiLogs[call.call_id]?.error}</AlertDescription>
                      </Alert>
                    )}

                    {!metaCapiLogs[call.call_id]?.loading &&
                      metaCapiLogs[call.call_id]?.events?.length === 0 && (
                        <div className="text-muted-foreground">No Meta CAPI logs for this call yet.</div>
                      )}

                    {(metaCapiLogs[call.call_id]?.events || []).map((event) => (
                      <div key={event.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={event.response_status && event.response_status < 300 ? "default" : "destructive"}>
                            {event.response_status ? `Status ${event.response_status}` : "No response"}
                          </Badge>
                          <span className="text-muted-foreground">Event: {event.event_name}</span>
                          {event.duration_ms !== undefined && (
                            <span className="text-muted-foreground">Time: {event.duration_ms} ms</span>
                          )}
                          <span className="text-muted-foreground">{formatDate(event.created_at)}</span>
                        </div>
                        {event.response_payload?.events_received !== undefined && (
                          <div>Events received: {event.response_payload.events_received}</div>
                        )}
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">Request payload</summary>
                          <pre className="mt-2 text-xs bg-muted/60 p-2 rounded overflow-auto">
                            {JSON.stringify(event.request_payload, null, 2)}
                          </pre>
                        </details>
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">Response payload</summary>
                          <pre className="mt-2 text-xs bg-muted/60 p-2 rounded overflow-auto">
                            {JSON.stringify(event.response_payload, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Additional Analytics Row */}
      {callStats && timeframeCounts && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{timeframeCounts.thisMonth}</div>
              <div className="text-[11px] text-muted-foreground">
                Cost: {formatCost(callStats.costThisMonth)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This Week</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{timeframeCounts.thisWeek}</div>
              <div className="text-[11px] text-muted-foreground">
                Cost: {formatCost(callStats.costThisWeek)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today vs Yesterday</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl font-semibold">{timeframeCounts.today}</div>
              <div className="text-[11px] text-muted-foreground">
                Yesterday: {timeframeCounts.yesterday}
                {timeframeCounts.yesterday > 0 && (
                  <span className="ml-1">
                    ({calculateGrowth(timeframeCounts.today, timeframeCounts.yesterday) >= 0 ? '+' : ''}
                    {calculateGrowth(timeframeCounts.today, timeframeCounts.yesterday).toFixed(1)}%)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          
        </div>
      )}

      {/* Billing Stats Row - Replaced with Auto Billing and Wallet Balance */}
      {user && ( // Ensure user object is available
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Replaced Actions Card */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              {walletLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="text-xl font-semibold">{walletBalance}</div>
              )}
              <p className="text-[11px] text-muted-foreground">
                <Link href="/dashboard/billing" className="text-blue-600 hover:underline">
                  Add funds
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {callStats && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{chartTitle}</CardTitle>
            <Select value={chartMetric} onValueChange={setChartMetric}>
              <SelectTrigger className="h-7 w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">Call Volume</SelectItem>
                <SelectItem value="transfers">Transfer Leads</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {chartData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                No data available for this range.
              </div>
            ) : (
              <ChartContainer
                config={{
                  calls: {
                    label: chartTitle,
                    color: "hsl(var(--primary))"
                  }
                }}
                className="h-[180px] w-full aspect-auto"
              >
                <LineChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-calls)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls (Database)</CardTitle>
          <CardDescription>Call data synced from Bland.ai and stored in your database</CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No Call Data Available</p>
              <Button onClick={() => syncCalls(true)} className="mt-4">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Sync Calls
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Meta CAPI</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>To Number</TableHead>
                    <TableHead>From Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <Fragment key={call.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleToggleMetaCapi(call.call_id)}
                          >
                            {expandedCallId === call.call_id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            Meta
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(call.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {call.to_number}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {call.from_number}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(call.status)}
                        </TableCell>
                        <TableCell>
                          {formatDuration(call.duration_seconds)}
                        </TableCell>
                        <TableCell>
                          {formatCost(0)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {call.ended_reason || 'unknown'}
                        </TableCell>
                      </TableRow>
                      {expandedCallId === call.call_id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/40">
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">Meta CAPI Events</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fetchMetaCapiEvents(call.call_id)}
                                >
                                  Refresh
                                </Button>
                              </div>

                              {metaCapiLogs[call.call_id]?.loading && (
                                <div className="text-muted-foreground">Loading Meta CAPI logs...</div>
                              )}

                              {metaCapiLogs[call.call_id]?.error && (
                                <Alert variant="destructive">
                                  <AlertDescription>{metaCapiLogs[call.call_id]?.error}</AlertDescription>
                                </Alert>
                              )}

                              {!metaCapiLogs[call.call_id]?.loading &&
                                metaCapiLogs[call.call_id]?.events?.length === 0 && (
                                  <div className="text-muted-foreground">No Meta CAPI logs for this call yet.</div>
                                )}

                              {(metaCapiLogs[call.call_id]?.events || []).map((event) => (
                                <div key={event.id} className="rounded-md border bg-background p-3 space-y-2">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <Badge variant={event.response_status && event.response_status < 300 ? "default" : "destructive"}>
                                      {event.response_status ? `Status ${event.response_status}` : "No response"}
                                    </Badge>
                                    <span className="text-muted-foreground">Event: {event.event_name}</span>
                                    {event.duration_ms !== undefined && (
                                      <span className="text-muted-foreground">Time: {event.duration_ms} ms</span>
                                    )}
                                    <span className="text-muted-foreground">{formatDate(event.created_at)}</span>
                                  </div>
                                  {event.response_payload?.events_received !== undefined && (
                                    <div>Events received: {event.response_payload.events_received}</div>
                                  )}
                                  <details>
                                    <summary className="cursor-pointer text-muted-foreground">Request payload</summary>
                                    <pre className="mt-2 text-xs bg-muted/60 p-2 rounded overflow-auto">
                                      {JSON.stringify(event.request_payload, null, 2)}
                                    </pre>
                                  </details>
                                  <details>
                                    <summary className="cursor-pointer text-muted-foreground">Response payload</summary>
                                    <pre className="mt-2 text-xs bg-muted/60 p-2 rounded overflow-auto">
                                      {JSON.stringify(event.response_payload, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}