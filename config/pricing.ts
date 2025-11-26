
export const PRICING_CONFIG = {
  // Rate per minute in cents
  CALL_RATE_PER_MINUTE_CENTS: 11, // $0.11 per minute
  
  // Minimum billable duration in seconds (e.g., 30 seconds minimum)
  MIN_BILLABLE_DURATION_SECONDS: 30,
  
  // Round up partial minutes (true) or calculate exact cost (false)
  ROUND_UP_PARTIAL_MINUTES: true
}

export function calculateCallCost(durationSeconds: number): {
  costCents: number
  durationMinutes: number
  ratePerMinuteCents: number
} {
  const { CALL_RATE_PER_MINUTE_CENTS, MIN_BILLABLE_DURATION_SECONDS, ROUND_UP_PARTIAL_MINUTES } = PRICING_CONFIG
  
  // Apply minimum billing duration
  const billableDuration = Math.max(durationSeconds, MIN_BILLABLE_DURATION_SECONDS)
  
  // Calculate minutes
  const exactMinutes = billableDuration / 60
  const durationMinutes = ROUND_UP_PARTIAL_MINUTES 
    ? Math.ceil(exactMinutes) 
    : Math.round(exactMinutes * 100) / 100 // Round to 2 decimal places
  
  // Calculate cost
  const costCents = Math.round(durationMinutes * CALL_RATE_PER_MINUTE_CENTS)
  
  return {
    costCents,
    durationMinutes,
    ratePerMinuteCents: CALL_RATE_PER_MINUTE_CENTS
  }
}
