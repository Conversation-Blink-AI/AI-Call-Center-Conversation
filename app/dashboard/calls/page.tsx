"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

interface CallStats {
  totalCalls: number
  completedCalls: number
  failedCalls: number
  totalDuration: number
  totalCost: number
  averageDuration: number
  successRate: number
  averageCostPerCall: number
  callsThisWeek: number
  callsThisMonth: number
  costThisWeek: number
  costThisMonth: number
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<string>("$0.00")
  const [walletLoading, setWalletLoading] = useState(false)

  // State for auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true)

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
      const callsResponse = await fetch(`/api/calls/database?userId=${user.id}&limit=50&offset=${(page - 1) * 50}`)
      if (callsResponse.ok) {
        const callsData = await callsResponse.json()
        setCalls(callsData.calls || [])
        setTotalPages(Math.ceil(callsData.total / 50))
      } else {
        throw new Error('Failed to fetch calls')
      }
    } catch (error) {
      console.error('Error fetching calls:', error)
      setError('Failed to fetch call data')
    }
  }

  const fetchCallStats = async () => {
    if (!user?.id) return

    try {
      // Fetch enhanced stats
      const statsResponse = await fetch(`/api/calls/stats?userId=${user.id}&timeframe=${timeframe}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setCallStats(statsData.stats)
        setTimeframeCounts(statsData.timeframeCounts)
      } else {
        throw new Error('Failed to fetch call stats')
      }
    } catch (error) {
      console.error('Error fetching call stats:', error)
      setError('Failed to fetch call data')
    }
  }

  const syncCalls = async (showToast = true) => {
    if (!user?.id || syncing) return

    try {
      setSyncing(true)
      setError(null)

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
        throw new Error('Failed to sync calls')
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

    } catch (error) {
      console.error('Sync error:', error)
      if (showToast) {
        toast.error('Failed to sync calls')
      }
      setError('Failed to sync calls')
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

  // Auto-refresh with sync every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !user?.id) return

    const interval = setInterval(async () => {
      console.log('🔄 [CALLS-PAGE] Periodic auto-refresh with sync...')
      try {
        // Sync calls first (without toast to avoid spam)
        await syncCalls(false)
      } catch (error) {
        console.warn('⚠️ [CALLS-PAGE] Periodic sync failed, refreshing cached data:', error)
        // If sync fails, still refresh the cached data
        fetchCalls()
        fetchCallStats()
        fetchWalletBalance()
      }
    }, 30000) // 100 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, user?.id, timeframe, page]) // Added dependencies

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">View and manage your synced call data from the database</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
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
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => syncCalls(true)} disabled={syncing} variant="outline">
            <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
          <Button onClick={() => setAutoRefresh(prev => !prev)} variant="ghost" className="flex items-center gap-1">
            {autoRefresh ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            Auto-Refresh {autoRefresh ? "On" : "Off"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analytics Cards */}
      {callStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{callStats.totalCalls}</div>
              {timeframeCounts && (
                <div className="flex items-center text-xs text-muted-foreground">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{callStats.successRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">
                {callStats.completedCalls} completed, {callStats.failedCalls} failed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(callStats.totalDuration)}</div>
              <div className="text-xs text-muted-foreground">
                Avg: {formatDuration(callStats.averageDuration)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCost(callStats.totalCost)}</div>
              <div className="text-xs text-muted-foreground">
                Avg: {formatCost(callStats.averageCostPerCall)} per call
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Analytics Row */}
      {callStats && timeframeCounts && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeframeCounts.thisMonth}</div>
              <div className="text-xs text-muted-foreground">
                Cost: {formatCost(callStats.costThisMonth)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeframeCounts.thisWeek}</div>
              <div className="text-xs text-muted-foreground">
                Cost: {formatCost(callStats.costThisWeek)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today vs Yesterday</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeframeCounts.today}</div>
              <div className="text-xs text-muted-foreground">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate per Minute</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.11</div>
              <div className="text-xs text-muted-foreground">
                Standard rate
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Stats Row - Replaced with Auto Billing and Wallet Balance */}
      {user && ( // Ensure user object is available
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Replaced Unbilled Calls Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto Billing</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">
                Calls billed automatically
              </p>
            </CardContent>
          </Card>

          {/* Replaced Actions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold">{walletBalance}</div>
              )}
              <p className="text-xs text-muted-foreground">
                <Link href="/dashboard/billing" className="text-blue-600 hover:underline">
                  Add funds
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
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
              <p className="text-muted-foreground">No calls found in database</p>
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
                    <TableRow key={call.id}>
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
                        {formatCost(call.cost_cents || 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {call.ended_reason || 'unknown'}
                      </TableCell>
                    </TableRow>
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