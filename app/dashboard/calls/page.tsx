"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Phone,
  Clock,
  DollarSign,
  RefreshCcw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  BarChart3,
  Calendar,
  X,
  Zap,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { AnalyticsMetricCard } from "@/components/analytics/analytics-metric-card"
import { AnalyticsChartCard } from "@/components/analytics/analytics-chart-card"
import { AnalyticsDateRangePicker } from "@/components/analytics/analytics-date-range-picker"
import {
  AnalyticsDateRange,
  appendDateRangeToParams,
  getDefaultDateRange,
} from "@/lib/analytics-date-range"
import {
  MetaCapiPerformance,
  MetaCapiStats,
  MetaCapiSeriesPoint,
} from "@/components/analytics/meta-capi-performance"
import {
  RecentCallsTable,
  DatabaseCall,
  MetaCapiState,
} from "@/components/analytics/recent-calls-table"

interface CallStats {
  totalCalls: number
  completedCalls: number
  failedCalls: number
  transferredCalls: number
  totalDuration: number
  totalCost: number
  averageDuration: number
  successRate: number
  qualifiedLeadsRate: number
  averageCostPerCall: number
  callsThisWeek: number
  callsThisMonth: number
  costThisWeek: number
  costThisMonth: number
  volumeSeries: { date: string; count: number }[]
  qualifiedLeadsSeries: { date: string; count: number }[]
}

interface TimeframeCounts {
  today: number
  yesterday: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
}

export default function CallsPage() {
  const { user } = useAuth()
  const [calls, setCalls] = useState<DatabaseCall[]>([])
  const [callStats, setCallStats] = useState<CallStats | null>(null)
  const [timeframeCounts, setTimeframeCounts] = useState<TimeframeCounts | null>(null)
  const [metaCapiStats, setMetaCapiStats] = useState<MetaCapiStats | null>(null)
  const [metaCapiSeries, setMetaCapiSeries] = useState<MetaCapiSeriesPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [metaCapiRefreshing, setMetaCapiRefreshing] = useState(false)
  const [metaCapiLoading, setMetaCapiLoading] = useState(true)
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(getDefaultDateRange)
  const [chartMetric, setChartMetric] = useState("volume")
  const [metaCapiChartFilter, setMetaCapiChartFilter] = useState<"fired" | "success" | "failed">("fired")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  const [metaCapiLogs, setMetaCapiLogs] = useState<Record<string, MetaCapiState>>({})
  const [walletBalance, setWalletBalance] = useState("$0.00")
  const [walletLoading, setWalletLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [metaCapiFilter, setMetaCapiFilter] = useState("all")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchWalletBalance = async () => {
    if (!user?.id) return
    setWalletLoading(true)
    try {
      const response = await fetch("/api/wallet/balance", { credentials: "include" })
      if (response.ok) {
        const data = await response.json()
        setWalletBalance(`$${(data.balance_cents / 100).toFixed(2)}`)
      } else {
        setWalletBalance("$0.00")
      }
    } catch {
      setWalletBalance("$0.00")
    } finally {
      setWalletLoading(false)
    }
  }

  const fetchCalls = useCallback(async () => {
    if (!user?.id) return

    try {
      setError(null)
      const params = new URLSearchParams({
        userId: user.id,
        limit: "50",
        offset: String((page - 1) * 50),
      })
      appendDateRangeToParams(params, dateRange)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (metaCapiFilter !== "all") params.set("metaCapiStatus", metaCapiFilter)
      if (debouncedSearch.trim()) params.set("phoneNumber", debouncedSearch.trim())

      const callsResponse = await fetch(`/api/calls/database?${params}`, { credentials: "include" })

      if (callsResponse.ok) {
        const callsData = await callsResponse.json()
        setCalls(callsData.calls || [])
        setTotalPages(Math.ceil((callsData.total || 0) / 50))
      } else {
        const errorData = await callsResponse.json().catch(() => ({}))
        if (callsResponse.status >= 500) {
          setError(`Server error: ${errorData.error || "Failed to fetch calls"}`)
        } else if (callsResponse.status === 401 || callsResponse.status === 403) {
          setError("Authentication error: Please refresh the page and try again")
        } else {
          setCalls([])
          setTotalPages(1)
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("fetch") || message.includes("network")) {
        setError("Network error: Please check your connection and try again")
      } else {
        setCalls([])
        setTotalPages(1)
      }
    }
  }, [user?.id, page, dateRange, statusFilter, metaCapiFilter, debouncedSearch])

  const fetchMetaCapiEvents = async (callId: string) => {
    setMetaCapiLogs((prev) => ({
      ...prev,
      [callId]: { loading: true, error: null, events: prev[callId]?.events || [] },
    }))

    try {
      const response = await fetch(`/api/meta-capi/events?call_id=${encodeURIComponent(callId)}&limit=20`, {
        credentials: "include",
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "Failed to fetch Meta CAPI events")

      setMetaCapiLogs((prev) => ({
        ...prev,
        [callId]: { loading: false, error: null, events: result.events || [] },
      }))
    } catch (fetchError: unknown) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to fetch Meta CAPI events"
      setMetaCapiLogs((prev) => ({
        ...prev,
        [callId]: { loading: false, error: message, events: [] },
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
      const statsParams = new URLSearchParams({ userId: user.id })
      appendDateRangeToParams(statsParams, dateRange)
      const statsResponse = await fetch(`/api/calls/stats?${statsParams}`, {
        credentials: "include",
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setCallStats(statsData.stats)
        setTimeframeCounts(statsData.timeframeCounts)
      } else {
        const errorData = await statsResponse.json().catch(() => ({}))
        if (statsResponse.status >= 500) {
          setError((prev) => prev || `Server error: ${errorData.error || "Failed to fetch stats"}`)
        } else if (statsResponse.status === 401 || statsResponse.status === 403) {
          setError("Authentication error: Please refresh the page and try again")
        } else {
          setCallStats(null)
          setTimeframeCounts(null)
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("fetch") || message.includes("network")) {
        setError((prev) => prev || "Network error: Please check your connection and try again")
      } else {
        setCallStats(null)
        setTimeframeCounts(null)
      }
    }
  }

  const fetchMetaCapiStats = async () => {
    if (!user?.id) return

    try {
      setMetaCapiLoading(true)
      const metaParams = new URLSearchParams()
      appendDateRangeToParams(metaParams, dateRange)
      const response = await fetch(`/api/meta-capi/stats?${metaParams}`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setMetaCapiStats(data.stats)
        setMetaCapiSeries(data.series || [])
      } else {
        setMetaCapiStats(null)
        setMetaCapiSeries([])
      }
    } catch {
      setMetaCapiStats(null)
      setMetaCapiSeries([])
    } finally {
      setMetaCapiLoading(false)
    }
  }

  const refreshMetaCapi = async () => {
    setMetaCapiRefreshing(true)
    await fetchMetaCapiStats()
    setMetaCapiRefreshing(false)
    toast.success("Meta CAPI data refreshed")
  }

  const syncCalls = async (showToast = true) => {
    if (!user?.id || syncing) return

    try {
      setSyncing(true)
      if (showToast) setError(null)

      const response = await fetch("/api/calls/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || "Failed to sync calls")
      }

      const result = await response.json()
      if (showToast) toast.success(result.message || "Calls synced successfully")

      await Promise.all([fetchCalls(), fetchCallStats(), fetchMetaCapiStats(), fetchWalletBalance()])
      return result
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sync calls"
      if (showToast) {
        toast.error(message)
        setError("Failed to sync calls")
      }
      throw error
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    const initializeData = async () => {
      try {
        await syncCalls(false)
      } catch {
        // continue with cached data
      } finally {
        await Promise.all([fetchCalls(), fetchCallStats(), fetchMetaCapiStats(), fetchWalletBalance()])
        setLoading(false)
      }
    }
    initializeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, dateRange])

  useEffect(() => {
    if (!user?.id || loading) return
    fetchCalls()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, metaCapiFilter, debouncedSearch])

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0m 0s"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatCost = (cents: number) => {
    if (!cents) return "$0.00"
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const volumeData = useMemo(
    () =>
      callStats?.volumeSeries?.map((item) => ({
        label: new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: item.count,
      })) || [],
    [callStats?.volumeSeries]
  )

  const qualifiedLeadsData = useMemo(
    () =>
      callStats?.qualifiedLeadsSeries?.map((item) => ({
        label: new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: item.count,
      })) || [],
    [callStats?.qualifiedLeadsSeries]
  )

  const chartData = chartMetric === "qualified" ? qualifiedLeadsData : volumeData
  const chartTitle = chartMetric === "qualified" ? "Transfer Leads" : "Call Volume"

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Loading your call performance data...</p>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your synced call data and Meta conversion tracking
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AnalyticsDateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range)
                setPage(1)
              }}
              className="w-[240px] sm:w-[280px]"
            />
            <Button onClick={() => syncCalls(true)} disabled={syncing} variant="outline">
              <RefreshCcw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
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

        {/* Top Summary Header */}
        {callStats && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <AnalyticsMetricCard
              title="Total Calls"
              value={callStats.totalCalls}
              helper="All calls received in the selected date range"
              icon={Phone}
              trend={
                timeframeCounts ? (
                  <span className="flex items-center gap-1">
                    This week: {timeframeCounts.thisWeek}
                    {timeframeCounts.lastWeek > 0 && (
                      <>
                        {calculateGrowth(timeframeCounts.thisWeek, timeframeCounts.lastWeek) >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        {Math.abs(
                          calculateGrowth(timeframeCounts.thisWeek, timeframeCounts.lastWeek)
                        ).toFixed(1)}
                        %
                      </>
                    )}
                  </span>
                ) : undefined
              }
            />
            <AnalyticsMetricCard
              title="Transfer Leads"
              value={`${callStats.qualifiedLeadsRate.toFixed(1)}%`}
              helper="Calls transferred to a live agent — your qualified lead rate"
              icon={Activity}
              trend={
                <span>
                  {callStats.transferredCalls} transferred of {callStats.totalCalls} total
                </span>
              }
            />
            <AnalyticsMetricCard
              title="Meta CAPI Events"
              value={metaCapiStats?.eventsFired ?? 0}
              helper="Conversion events sent to Facebook/Meta from your flows"
              icon={Zap}
            />
            <AnalyticsMetricCard
              title="Meta CAPI Success"
              value={`${(metaCapiStats?.successRate ?? 0).toFixed(1)}%`}
              helper="Share of Meta events accepted by the Meta API"
              icon={CheckCircle2}
              trend={
                <span>
                  {metaCapiStats?.eventsSuccessful ?? 0} ok / {metaCapiStats?.eventsFailed ?? 0} failed
                </span>
              }
            />
            <AnalyticsMetricCard
              title="Total Duration"
              value={formatDuration(callStats.totalDuration)}
              helper="Combined talk time across all calls in this period"
              icon={Clock}
              trend={<span>Avg: {formatDuration(callStats.averageDuration)} per call</span>}
            />
            <AnalyticsMetricCard
              title="Total Cost"
              value={formatCost(callStats.totalCost)}
              helper="Total spend on calls in the selected period"
              icon={DollarSign}
              trend={<span>Avg: {formatCost(callStats.averageCostPerCall)} per call</span>}
            />
          </div>
        )}

        {/* Secondary metrics */}
        {callStats && timeframeCounts && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <AnalyticsMetricCard
              title="This Month"
              value={timeframeCounts.thisMonth}
              helper="Calls so far this calendar month"
              icon={Calendar}
              trend={<span>Cost: {formatCost(callStats.costThisMonth)}</span>}
            />
            <AnalyticsMetricCard
              title="This Week"
              value={timeframeCounts.thisWeek}
              helper="Calls since the start of this week"
              icon={BarChart3}
              trend={<span>Cost: {formatCost(callStats.costThisWeek)}</span>}
            />
            <AnalyticsMetricCard
              title="Today"
              value={timeframeCounts.today}
              helper="Calls received today vs yesterday"
              icon={TrendingUp}
              trend={
                <span>
                  Yesterday: {timeframeCounts.yesterday}
                  {timeframeCounts.yesterday > 0 && (
                    <span className="ml-1">
                      ({calculateGrowth(timeframeCounts.today, timeframeCounts.yesterday) >= 0 ? "+" : ""}
                      {calculateGrowth(timeframeCounts.today, timeframeCounts.yesterday).toFixed(1)}%)
                    </span>
                  )}
                </span>
              }
            />
            <AnalyticsMetricCard
              title="Wallet Balance"
              value={walletLoading ? "..." : walletBalance}
              helper="Available credits for making calls"
              icon={Wallet}
              trend={
                <Link href="/dashboard/billing" className="text-primary hover:underline">
                  Add funds →
                </Link>
              }
            />
          </div>
        )}

        {/* Meta CAPI Performance Section */}
        <MetaCapiPerformance
          stats={metaCapiStats}
          series={metaCapiSeries}
          chartFilter={metaCapiChartFilter}
          onChartFilterChange={setMetaCapiChartFilter}
          onRefresh={refreshMetaCapi}
          refreshing={metaCapiRefreshing}
          loading={metaCapiLoading}
        />

        {/* Charts row */}
        {callStats && (
          <div className="grid gap-4 lg:grid-cols-1">
            <AnalyticsChartCard
              title={chartTitle}
              data={chartData}
              emptyMessage="No call data available for this range."
              colorKey="calls"
              color="hsl(var(--primary))"
              headerRight={
                <Select value={chartMetric} onValueChange={setChartMetric}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volume">Call Volume</SelectItem>
                    <SelectItem value="qualified">Transfer Leads</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        )}

        {/* Recent Calls Table */}
        <RecentCallsTable
          calls={calls}
          expandedCallId={expandedCallId}
          metaCapiLogs={metaCapiLogs}
          onToggleExpand={handleToggleMetaCapi}
          onRefreshMetaCapi={fetchMetaCapiEvents}
          onSyncCalls={() => syncCalls(true)}
          syncing={syncing}
          searchQuery={searchQuery}
          onSearchChange={(v) => {
            setSearchQuery(v)
            setPage(1)
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
          metaCapiFilter={metaCapiFilter}
          onMetaCapiFilterChange={(v) => {
            setMetaCapiFilter(v)
            setPage(1)
          }}
          formatDuration={formatDuration}
          formatCost={formatCost}
          formatDate={formatDate}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
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
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
    </div>
  )
}
