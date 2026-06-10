/**
 * Shared helpers for parsing Bland.ai webhook and API payloads into call_logs fields.
 */

export function extractBlandField(body: any, field: string, altFields?: string[]): any {
  if (body?.[field] !== undefined && body[field] !== null) {
    return body[field]
  }

  if (body?.variables?.[field] !== undefined && body.variables[field] !== null) {
    return body.variables[field]
  }

  if (altFields) {
    for (const altField of altFields) {
      if (body?.[altField] !== undefined && body[altField] !== null) {
        return body[altField]
      }
      if (body?.variables?.[altField] !== undefined && body.variables[altField] !== null) {
        return body.variables[altField]
      }
    }
  }

  return null
}

export function extractBlandTranscript(body: any): string | null {
  if (body?.concatenated_transcript) {
    return body.concatenated_transcript
  }

  if (body?.transcripts && Array.isArray(body.transcripts) && body.transcripts.length > 0) {
    return body.transcripts
      .map((t: any) => {
        const role = t.user || "unknown"
        const text = t.text || ""
        return `${role}: ${text}`
      })
      .join("\n")
  }

  return body?.transcription || body?.transcript || null
}

/**
 * Bland sends corrected_duration in seconds and call_length in minutes.
 */
export function parseBlandDuration(body: any): number | null {
  const correctedDuration = body?.corrected_duration
  if (correctedDuration !== undefined && correctedDuration !== null) {
    const parsed =
      typeof correctedDuration === "string"
        ? parseFloat(correctedDuration)
        : Number(correctedDuration)
    if (!isNaN(parsed)) {
      return Math.round(parsed)
    }
  }

  if (body?.call_length !== undefined && body.call_length !== null) {
    const minutes = Number(body.call_length)
    if (!isNaN(minutes)) {
      return Math.round(minutes * 60)
    }
  }

  if (body?.duration !== undefined && body.duration !== null) {
    const parsed = Number(body.duration)
    if (!isNaN(parsed)) {
      return Math.round(parsed)
    }
  }

  return null
}

export function parseBlandTimestamp(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null
  const date = new Date(String(value))
  if (isNaN(date.getTime())) return null
  return date.toISOString()
}

export interface BlandCallLogPayload {
  call_id: string
  user_id: string
  to_number: string
  from_number: string
  duration_seconds?: number | null
  status?: string | null
  recording_url?: string | null
  transcript?: string | null
  summary?: string | null
  pathway_id?: string | null
  ended_reason?: string | null
  start_time?: string | null
  end_time?: string | null
  queue_time?: number | null
  latency_ms?: number | null
  interruptions?: number | null
  phone_number_id?: string | null
  phone_number?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  zip?: string | null
  short_from?: string | null
  short_to?: string | null
  call_timezone?: string | null
  call_time_utc?: string | null
  call_local_time?: string | null
  transferred_to?: string | null
  transferred_at?: string | null
  record_enabled?: boolean | null
  completed?: boolean | null
  error_message?: string | null
  queue_status?: string | null
  pre_transfer_duration?: number | null
  post_transfer_duration?: number | null
  language?: string | null
  placement_group?: string | null
  region?: string | null
  transcripts_json?: unknown
  pathway_logs_json?: unknown
  raw_webhook_payload?: unknown
}

export function mapBlandWebhookToCallLog(
  body: any,
  userId: string,
  phoneNumberId: string | null
): BlandCallLogPayload {
  const callId = body.call_id || body.c_id || body.id

  return {
    call_id: callId,
    user_id: userId,
    from_number: extractBlandField(body, "from", ["from_number", "fromNumber"]) || "",
    to_number: extractBlandField(body, "to", ["to_number", "toNumber"]) || "",
    duration_seconds: parseBlandDuration(body),
    status: extractBlandField(body, "status") || null,
    recording_url: extractBlandField(body, "recording_url") || null,
    transcript: extractBlandTranscript(body),
    summary: extractBlandField(body, "summary") || null,
    pathway_id: extractBlandField(body, "pathway_id") || null,
    ended_reason:
      extractBlandField(body, "call_ended_by", ["ended_reason"]) || null,
    start_time:
      parseBlandTimestamp(
        extractBlandField(body, "started_at", ["start_time"])
      ) || null,
    end_time:
      parseBlandTimestamp(
        extractBlandField(body, "end_at", ["ended_at", "end_time"])
      ) || null,
    queue_time: extractBlandField(body, "queue_time") ?? null,
    latency_ms:
      extractBlandField(body, "latency_ms", ["latency"]) ?? null,
    interruptions: extractBlandField(body, "interruptions") ?? null,
    phone_number_id: phoneNumberId,
    phone_number: extractBlandField(body, "phone_number") || null,
    country: extractBlandField(body, "country") || null,
    state: extractBlandField(body, "state") || null,
    city: extractBlandField(body, "city") || null,
    zip: extractBlandField(body, "zip") || null,
    short_from: extractBlandField(body, "short_from") || null,
    short_to: extractBlandField(body, "short_to") || null,
    call_timezone:
      parseBlandTimestamp(extractBlandField(body, "timestamp")) ||
      parseBlandTimestamp(extractBlandField(body, "started_at", ["start_time"])) ||
      null,
    call_time_utc:
      parseBlandTimestamp(extractBlandField(body, "end_at", ["ended_at", "end_time"])) ||
      parseBlandTimestamp(body.updated_at) ||
      null,
    call_local_time: extractBlandField(body, "now", ["call_local_time"]) || null,
    transferred_to: body.transferred_to || null,
    transferred_at: parseBlandTimestamp(body.transferred_at),
    record_enabled: body.record ?? null,
    completed: body.completed ?? null,
    error_message: body.error_message || null,
    queue_status: body.queue_status || null,
    pre_transfer_duration: body.pre_transfer_duration ?? null,
    post_transfer_duration: body.post_transfer_duration ?? null,
    language: extractBlandField(body, "language") || null,
    placement_group: extractBlandField(body, "placement_group") || null,
    region: extractBlandField(body, "region") || null,
    transcripts_json: body.transcripts ?? null,
    pathway_logs_json: body.pathway_logs ?? null,
    raw_webhook_payload: body,
  }
}
