export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last14"
  | "last28"
  | "all"
  | "custom"

export interface AnalyticsDateRange {
  from: Date | null
  to: Date | null
  preset: DateRangePreset
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function subDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

export function getPresetRange(preset: DateRangePreset): AnalyticsDateRange {
  const today = startOfDay(new Date())

  switch (preset) {
    case "today":
      return { from: today, to: today, preset }
    case "yesterday": {
      const yesterday = subDays(today, 1)
      return { from: yesterday, to: yesterday, preset }
    }
    case "last7":
      return { from: subDays(today, 6), to: today, preset }
    case "last14":
      return { from: subDays(today, 13), to: today, preset }
    case "last28":
      return { from: subDays(today, 27), to: today, preset }
    case "all":
      return { from: null, to: null, preset }
    case "custom":
      return { from: null, to: null, preset }
  }
}

export function getDefaultDateRange(): AnalyticsDateRange {
  return getPresetRange("last7")
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function rangesEqual(a: AnalyticsDateRange, b: AnalyticsDateRange): boolean {
  if (a.preset !== b.preset) return false
  if (a.from === null && b.from === null && a.to === null && b.to === null) return true
  if (!a.from || !b.from || !a.to || !b.to) return false
  return isSameDay(a.from, b.from) && isSameDay(a.to, b.to)
}

export function formatDateRangeLabel(range: AnalyticsDateRange): string {
  if (range.preset === "all" || (!range.from && !range.to)) {
    return "All available"
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  if (range.from && range.to) {
    if (isSameDay(range.from, range.to)) {
      return formatter.format(range.from)
    }
    return `${formatter.format(range.from)} – ${formatter.format(range.to)}`
  }

  if (range.from) return formatter.format(range.from)
  if (range.to) return formatter.format(range.to)
  return "Select dates"
}

export function appendDateRangeToParams(
  params: URLSearchParams,
  range: AnalyticsDateRange
): void {
  if (range.preset === "all" || (!range.from && !range.to)) {
    params.set("allTime", "true")
    return
  }

  if (range.from) {
    params.set("startDate", startOfDay(range.from).toISOString())
  }
  if (range.to) {
    params.set("endDate", endOfDay(range.to).toISOString())
  } else if (range.from) {
    params.set("endDate", endOfDay(range.from).toISOString())
  }
}

export function resolveAnalyticsDateRange(searchParams: URLSearchParams): {
  start: Date | null
  end: Date | null
} {
  if (searchParams.get("allTime") === "true") {
    return { start: null, end: null }
  }

  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (startDate || endDate) {
    return {
      start: startDate ? new Date(startDate) : null,
      end: endDate ? new Date(endDate) : new Date(),
    }
  }

  const timeframe = searchParams.get("timeframe") || "7d"
  const now = new Date()

  if (timeframe === "all") {
    return { start: null, end: null }
  }

  const days = parseInt(timeframe.replace("d", ""), 10)
  if (isNaN(days)) {
    return { start: subDays(startOfDay(now), 6), end: now }
  }

  return {
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    end: now,
  }
}
