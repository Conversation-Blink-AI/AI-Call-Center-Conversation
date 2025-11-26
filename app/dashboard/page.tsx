"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, BarChart3, Settings, TrendingUp, Activity, Zap, RefreshCw } from "lucide-react"
import Link from "next/link"
import { RecentFlows } from "@/components/recent-flows"
import { useUserCallData } from "@/hooks/use-user-call-data"
import { Wallet } from "lucide-react"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const {
    calls,
    totalCalls,
    userPhoneNumber,
    loading: callDataLoading,
    error,
    lastUpdated,
    refetch,
  } = useUserCallData()

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
        // Store balance cents in user context for other components
        if (user) {
          user.balance_cents = data.balance_cents
        }
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

  // Fetch wallet balance on component mount
  useEffect(() => {
    if (user?.id) {
      fetchWalletBalance()
    }
  }, [user?.id])

  // Calculate metrics from call data
  const calculateMetrics = () => {
    if (!calls || calls.length === 0) {
      return {
        successRate: 0,
        callsThisMonth: 0,
        activeFlows: 0,
      }
    }

    // Calculate success rate (calls with duration > 30 seconds or completed status)
    const successfulCalls = calls.filter(
      (call) => call.status === "completed" && (call.duration > 30 || call.outcome === "successful"),
    ).length
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

    // Calculate calls this month
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const callsThisMonth = calls.filter((call) => new Date(call.start_time) >= currentMonthStart).length

    // Calculate active flows (unique pathway IDs)
    const uniquePathways = new Set(calls.filter((call) => call.pathway_id).map((call) => call.pathway_id))
    const activeFlows = uniquePathways.size

    return { successRate, callsThisMonth, activeFlows }
  }

  const metrics = calculateMetrics()

  // Format relative time for "last updated"
  const formatRelativeTime = (date: Date | null) => {
    if (!date) return ""

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "just now"
    if (diffMins === 1) return "1 minute ago"
    if (diffMins < 60) return `${diffMins} minutes ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    return `${diffHours} hours ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Handle unauthenticated users
  if (!loading && !user) {
    // Redirect to home page if not authenticated
    useEffect(() => {
      router.push("/")
    }, [router])

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || user.email?.split("@")[0] || "User"}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">Here's what's happening with your call flows today.</p>
            {userPhoneNumber && <p className="text-sm text-muted-foreground mt-1">Phone Number: {userPhoneNumber}</p>}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">Last updated: {formatRelativeTime(lastUpdated)}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={callDataLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${callDataLoading ? "animate-spin" : ""}`} />
            {callDataLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">Error loading call data: {error}</p>
          </div>
        )}

        {/* No Phone Number State */}
        {!callDataLoading && !userPhoneNumber && (
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-yellow-800 font-medium mb-2">No Phone Number Found</h3>
            <p className="text-yellow-700 text-sm mb-4">
              You need to purchase a phone number to start making calls and see analytics.
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard/phone-numbers/purchase">Purchase Phone Number</Link>
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {callDataLoading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">{totalCalls.toLocaleString()}</div>
                  {metrics.callsThisMonth > 0 && (
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      <p className="text-xs text-green-600 font-medium">{metrics.callsThisMonth} this month</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Flows</CardTitle>
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {callDataLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold text-foreground">{metrics.activeFlows}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Unique pathways used</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              {callDataLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold text-foreground">{metrics.successRate.toFixed(1)}%</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Completed calls</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Purchased Numbers</CardTitle>
              <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              {callDataLoading ? (
                <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold text-foreground">{userPhoneNumber ? "1" : "0"}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{userPhoneNumber ? "1 purchased" : "No numbers yet"}</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Wallet className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold text-foreground">{walletBalance}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                <Link href="/dashboard/billing" className="text-blue-600 hover:underline">
                  Manage billing
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">Explore Voices</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">
                Browse and manage AI voices for your call flows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                <Link href="/dashboard/voices">Browse Voices</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">Phone Numbers</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">
                Manage your phone numbers and purchase new ones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href="/dashboard/phone-numbers">View Numbers</Link>
              </Button>
              <Button variant="outline" asChild className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                <Link href="/dashboard/phone-numbers/purchase">Purchase Number</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">Analytics & Database</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">View detailed analytics, call history, and database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link href="/dashboard/calls">View Analytics</Link>
              </Button>
              <Button variant="outline" asChild className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                <Link href="/dashboard/call-history">Call History</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Flows Section */}
        <Card className="bg-card shadow-sm border border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Recent Call Flows</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your recently created and modified call flows
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <RecentFlows />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}