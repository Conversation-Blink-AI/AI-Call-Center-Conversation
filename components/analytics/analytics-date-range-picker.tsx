"use client"

import { useEffect, useState } from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  AnalyticsDateRange,
  DateRangePreset,
  formatDateRangeLabel,
  getPresetRange,
} from "@/lib/analytics-date-range"

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last14", label: "Last 14 days" },
  { id: "last28", label: "Last 28 days" },
  { id: "all", label: "All available" },
  { id: "custom", label: "Custom" },
]

interface AnalyticsDateRangePickerProps {
  value: AnalyticsDateRange
  onChange: (range: AnalyticsDateRange) => void
  className?: string
}

function toCalendarRange(range: AnalyticsDateRange): DateRange | undefined {
  if (!range.from && !range.to) return undefined
  return { from: range.from ?? undefined, to: range.to ?? undefined }
}

function fromCalendarRange(
  calendarRange: DateRange | undefined,
  preset: DateRangePreset
): AnalyticsDateRange {
  return {
    from: calendarRange?.from ?? null,
    to: calendarRange?.to ?? calendarRange?.from ?? null,
    preset,
  }
}

export function AnalyticsDateRangePicker({
  value,
  onChange,
  className,
}: AnalyticsDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AnalyticsDateRange>(value)

  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Local time"

  const handlePreset = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setDraft((prev) => ({ ...prev, preset: "custom" }))
      return
    }
    setDraft(getPresetRange(preset))
  }

  const handleCalendarSelect = (calendarRange: DateRange | undefined) => {
    setDraft(fromCalendarRange(calendarRange, "custom"))
  }

  const handleUpdate = () => {
    onChange(draft)
    setOpen(false)
  }

  const handleCancel = () => {
    setDraft(value)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-9 justify-between gap-2 font-normal", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{formatDateRangeLabel(value)}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r p-3 sm:min-w-[150px]">
            <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">Presets</p>
            <div className="space-y-0.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePreset(preset.id)}
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                    draft.preset === preset.id && "bg-muted font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "mr-2 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                      draft.preset === preset.id ? "border-primary" : "border-muted-foreground/40"
                    )}
                  >
                    {draft.preset === preset.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={toCalendarRange(draft)}
              onSelect={handleCalendarSelect}
              defaultMonth={draft.from ?? draft.to ?? new Date()}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{formatDateRangeLabel(draft)}</p>
            <p className="text-xs text-muted-foreground">Dates are shown in {timezone}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={draft.preset === "custom" && !draft.from}
            >
              Update
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
