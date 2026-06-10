"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

export interface ChartDataPoint {
  label: string
  count: number
}

interface AnalyticsChartCardProps {
  title: string
  data: ChartDataPoint[]
  emptyMessage?: string
  colorKey?: string
  color?: string
  chartType?: "line" | "bar"
  headerRight?: React.ReactNode
  className?: string
}

export function AnalyticsChartCard({
  title,
  data,
  emptyMessage = "No data available for this range.",
  colorKey = "events",
  color = "hsl(var(--primary))",
  chartType = "line",
  headerRight,
  className,
}: AnalyticsChartCardProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        {headerRight}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {data.length === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <ChartContainer
            config={{
              [colorKey]: {
                label: title,
                color,
              },
            }}
            className="h-[220px] w-full aspect-auto"
          >
            {chartType === "bar" ? (
              <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" fontSize={11} />
                <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} fontSize={11} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Bar
                  dataKey="count"
                  fill={`var(--color-${colorKey})`}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" fontSize={11} />
                <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} fontSize={11} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={`var(--color-${colorKey})`}
                  strokeWidth={2}
                  dot={{ r: 3, fill: `var(--color-${colorKey})`, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
