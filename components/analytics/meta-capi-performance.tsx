"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, Clock, RefreshCcw, XCircle, Zap } from "lucide-react"
import { AnalyticsChartCard, ChartDataPoint } from "./analytics-chart-card"

export interface MetaCapiStats {
  eventsFired: number
  eventsSuccessful: number
  eventsFailed: number
  successRate: number
  lastEventFired: string | null
}

export interface MetaCapiSeriesPoint {
  date: string
  fired: number
  success: number
  failed: number
}

type MetaCapiChartFilter = "fired" | "success" | "failed"

interface MetaCapiPerformanceProps {
  stats: MetaCapiStats | null
  series: MetaCapiSeriesPoint[]
  chartFilter: MetaCapiChartFilter
  onChartFilterChange: (filter: MetaCapiChartFilter) => void
  onRefresh: () => void
  refreshing?: boolean
  loading?: boolean
}

function formatLastFired(dateString: string | null) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

const FILTER_OPTIONS: { value: MetaCapiChartFilter; label: string }[] = [
  { value: "fired", label: "Fired" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
]

export function MetaCapiPerformance({
  stats,
  series,
  chartFilter,
  onChartFilterChange,
  onRefresh,
  refreshing = false,
  loading = false,
}: MetaCapiPerformanceProps) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    return series.map((item) => ({
      label: new Date(item.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count: item[chartFilter],
    }))
  }, [series, chartFilter])

  const filterLabel =
    chartFilter === "fired" ? "Events Fired" : chartFilter === "success" ? "Successful" : "Failed"

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Meta CAPI Performance</CardTitle>
          <CardDescription>
            Track Facebook conversion events sent from your call flows to Meta.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="shrink-0">
          <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh Meta CAPI
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricPill
            icon={Zap}
            label="Events Fired"
            value={stats?.eventsFired ?? 0}
            helper="Total events sent to Meta"
          />
          <MetricPill
            icon={CheckCircle2}
            label="Successful"
            value={stats?.eventsSuccessful ?? 0}
            helper="Accepted by Meta API"
          />
          <MetricPill
            icon={XCircle}
            label="Failed"
            value={stats?.eventsFailed ?? 0}
            helper="Rejected or errored"
          />
          <MetricPill
            icon={Clock}
            label="Success Rate"
            value={`${(stats?.successRate ?? 0).toFixed(1)}%`}
            helper={`Last fired: ${formatLastFired(stats?.lastEventFired ?? null)}`}
          />
        </div>

        <AnalyticsChartCard
          title="Meta CAPI Events"
          data={chartData}
          emptyMessage="No Meta CAPI events fired yet"
          colorKey="capi"
          color="hsl(var(--primary))"
          chartType={chartFilter === "failed" ? "bar" : "line"}
          headerRight={
            <div className="flex rounded-md border bg-muted/50 p-0.5">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChartFilterChange(opt.value)}
                  className={cn(
                    "rounded px-3 py-1 text-xs font-medium transition-colors",
                    chartFilter === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        />
        <p className="text-center text-[11px] text-muted-foreground">
          Showing {filterLabel.toLowerCase()} by day for the selected date range
        </p>
      </CardContent>
    </Card>
  )
}

function MetricPill({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  helper: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{helper}</p>
    </div>
  )
}
