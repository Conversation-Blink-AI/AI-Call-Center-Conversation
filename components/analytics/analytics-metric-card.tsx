import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnalyticsMetricCardProps {
  title: string
  value: React.ReactNode
  helper: string
  icon: LucideIcon
  trend?: React.ReactNode
  className?: string
}

export function AnalyticsMetricCard({
  title,
  value,
  helper,
  icon: Icon,
  trend,
  className,
}: AnalyticsMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          {trend && <div className="text-xs text-muted-foreground">{trend}</div>}
          <p className="text-[11px] leading-relaxed text-muted-foreground">{helper}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
