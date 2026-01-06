import { NextRequest, NextResponse } from "next/server"
import { findUserByPhoneNumber } from "@/lib/phone-number-lookup"
import { createCallLog } from "@/lib/db-utils"
import { toE164Format } from "@/utils/phone-utils"

export const dynamic = "force-dynamic"

/**
 * Helper function to extract fields from webhook payload
 * Priority: root level → variables object → alternative field names → null
 */
function extractField(body: any, field: string, altFields?: string[]): any {
  // Try root level first
  if (body[field] !== undefined && body[field] !== null) {
    return body[field]
  }
  
  // Try variables object
  if (body.variables && body.variables[field] !== undefined && body.variables[field] !== null) {
    return body.variables[field]
  }
  
  // Try alternative field names at root level
  if (altFields) {
    for (const altField of altFields) {
      if (body[altField] !== undefined && body[altField] !== null) {
        return body[altField]
      }
      // Also check in variables object
      if (body.variables && body.variables[altField] !== undefined && body.variables[altField] !== null) {
        return body.variables[altField]
      }
    }
  }
  
  return null
}

/**
 * Helper function to extract and format transcript from various formats
 */
function extractTranscript(body: any): string | null {
  // Try concatenated_transcript first (preferred - already formatted)
  if (body.concatenated_transcript) {
    return body.concatenated_transcript
  }
  
  // Try transcripts array - format as conversation
  if (body.transcripts && Array.isArray(body.transcripts) && body.transcripts.length > 0) {
    return body.transcripts
      .map((t: any) => {
        const role = t.user || 'unknown'
        const text = t.text || ''
        return `${role}: ${text}`
      })
      .join('\n')
  }
  
  // Fallback to root level fields
  return body.transcription || body.transcript || null
}

/**
 * Helper function to parse duration from various formats
 */
function parseDuration(body: any): number | null {
  // Try corrected_duration (may be string)
  const correctedDuration = body.corrected_duration
  if (correctedDuration !== undefined && correctedDuration !== null) {
    const parsed = typeof correctedDuration === 'string' 
      ? parseFloat(correctedDuration) 
      : Number(correctedDuration)
    if (!isNaN(parsed)) {
      return parsed
    }
  }
  
  // Try call_length (usually a number)
  if (body.call_length !== undefined && body.call_length !== null) {
    const parsed = Number(body.call_length)
    if (!isNaN(parsed)) {
      return parsed
    }
  }
  
  // Fallback to duration
  if (body.duration !== undefined && body.duration !== null) {
    const parsed = Number(body.duration)
    if (!isNaN(parsed)) {
      return parsed
    }
  }
  
  return null
}

/**
 * GET endpoint for webhook health check and testing
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Bland.ai webhook endpoint is active",
    endpoint: "/api/webhooks/bland",
    method: "POST",
    timestamp: new Date().toISOString(),
    instructions: {
      webhook_url: "Configure this URL in Bland.ai dashboard",
      method: "POST",
      content_type: "application/json",
      required_fields: ["call_id", "from or from_number", "to or to_number"]
    }
  })
}

/**
 * Bland AI Webhook - Receives call data and saves to call_logs table
 * 
 * This webhook receives call completion events from Bland.ai and:
 * 1. Identifies the user by phone number (from_number or to_number)
 * 2. Maps the webhook payload to call_logs format
 * 3. Saves the call data to the call_logs table
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔔 [BLAND-WEBHOOK] ==================== BLAND WEBHOOK CALLED ====================")
    console.log("🔔 [BLAND-WEBHOOK] Timestamp:", new Date().toISOString())
    
    // Log request details for debugging
    console.log("🔔 [BLAND-WEBHOOK] Request URL:", request.url)
    console.log("🔔 [BLAND-WEBHOOK] Request method:", request.method)
    console.log("🔔 [BLAND-WEBHOOK] Headers:", Object.fromEntries(request.headers.entries()))
    
    // Get raw body first for debugging
    let body: any
    try {
      body = await request.json()
    } catch (jsonError: any) {
      console.error("❌ [BLAND-WEBHOOK] JSON parsing error:", jsonError)
      console.error("❌ [BLAND-WEBHOOK] Error details:", jsonError.message)
      
      // Try to get raw text for debugging
      try {
        const text = await request.text()
        console.error("❌ [BLAND-WEBHOOK] Raw request body:", text.substring(0, 500))
      } catch (textError) {
        console.error("❌ [BLAND-WEBHOOK] Could not read request body:", textError)
      }
      
      return NextResponse.json({ 
        error: "Invalid JSON payload",
        message: jsonError.message || "Failed to parse request body as JSON"
      }, { status: 400 })
    }
    console.log("🔔 [BLAND-WEBHOOK] Received webhook payload:", JSON.stringify(body, null, 2))
    console.log("🔔 [BLAND-WEBHOOK] Body type:", typeof body)
    console.log("🔔 [BLAND-WEBHOOK] Body keys:", Object.keys(body || {}))

    // Extract call ID (Bland.ai may use different field names)
    const actualCallId = body.call_id || body.c_id || body.id
    console.log("🔔 [BLAND-WEBHOOK] Extracted call_id:", actualCallId)

    if (!actualCallId) {
      console.log("⚠️ [BLAND-WEBHOOK] No call ID found in webhook")
      return NextResponse.json({ 
        error: "Missing call_id",
        message: "Webhook payload must contain call_id, c_id, or id field"
      }, { status: 400 })
    }

    // Extract phone numbers - try multiple field name variations (including nested variables)
    const fromNumber = extractField(body, 'from', ['from_number', 'fromNumber']) || 
                       body.from || body.from_number || body.fromNumber || body['from_number']
    const toNumber = extractField(body, 'to', ['to_number', 'toNumber']) || 
                     body.to || body.to_number || body.toNumber || body['to_number']
    
    console.log("🔔 [BLAND-WEBHOOK] Raw phone number values:")
    console.log("   - body.from:", body.from)
    console.log("   - body.from_number:", body.from_number)
    console.log("   - body.fromNumber:", body.fromNumber)
    console.log("   - Extracted fromNumber:", fromNumber)
    console.log("   - body.to:", body.to)
    console.log("   - body.to_number:", body.to_number)
    console.log("   - body.toNumber:", body.toNumber)
    console.log("   - Extracted toNumber:", toNumber)

    if (!fromNumber && !toNumber) {
      console.log("⚠️ [BLAND-WEBHOOK] No phone numbers found in webhook")
      return NextResponse.json({ 
        error: "Missing phone numbers",
        message: "Webhook payload must contain from/from_number or to/to_number fields"
      }, { status: 400 })
    }

    // Find user by phone number
    console.log(`🔍 [BLAND-WEBHOOK] Looking up user for phone numbers - from: ${fromNumber}, to: ${toNumber}`)
    const userLookup = await findUserByPhoneNumber(fromNumber, toNumber)

    if (!userLookup) {
      console.log(`⚠️ [BLAND-WEBHOOK] User not found for phone numbers - from: ${fromNumber}, to: ${toNumber}`)
      console.log(`⚠️ [BLAND-WEBHOOK] This might be a test call or call from unregistered number`)
      console.log(`⚠️ [BLAND-WEBHOOK] Returning 200 to prevent Bland.ai from retrying`)
      
      // Return 200 instead of 404 to prevent Bland.ai from retrying
      // Log the call but don't save it if user not found
      return NextResponse.json({ 
        success: false,
        error: "User not found",
        message: `No registered user found for phone numbers: from=${fromNumber}, to=${toNumber}`,
        callId: actualCallId,
        note: "Call logged but not saved - user not registered"
      }, { status: 200 })
    }

    console.log(`✅ [BLAND-WEBHOOK] Found user: ${userLookup.user_id}, phone_number_id: ${userLookup.phone_number_id}`)

    // Map webhook payload to call_logs format
    // Mapping all Bland.ai built-in variables with support for nested variables object
    const callLogData = {
      call_id: actualCallId,
      user_id: userLookup.user_id,
      from_number: fromNumber ? toE164Format(fromNumber) : '',
      to_number: toNumber ? toE164Format(toNumber) : '',
      duration_seconds: parseDuration(body),
      status: extractField(body, 'status') || body.status || null,
      recording_url: extractField(body, 'recording_url') || body.recording_url || null,
      transcript: extractTranscript(body),
      summary: extractField(body, 'summary') || body.summary || null,
      pathway_id: extractField(body, 'pathway_id') || body.pathway_id || null,
      ended_reason: extractField(body, 'call_ended_by', ['ended_reason']) || body.call_ended_by || body.ended_reason || null,
      start_time: extractField(body, 'started_at', ['start_time']) || body.started_at || body.start_time || null,
      end_time: extractField(body, 'end_at', ['ended_at', 'end_time']) || body.end_at || body.ended_at || body.end_time || null,
      queue_time: extractField(body, 'queue_time') || body.queue_time || null,
      latency_ms: extractField(body, 'latency_ms', ['latency']) || body.latency_ms || body.latency || null,
      interruptions: extractField(body, 'interruptions') || body.interruptions || null,
      phone_number_id: userLookup.phone_number_id || null,
      // Bland.ai built-in variables mapping (check nested variables object first)
      phone_number: extractField(body, 'phone_number') || body.phone_number || null, // {{phone_number}} - Always the other party's number
      country: extractField(body, 'country') || body.country || null, // {{country}} - Country code (e.g., US)
      state: extractField(body, 'state') || body.state || null, // {{state}} - State/province (may be city name for some countries)
      city: extractField(body, 'city') || body.city || null, // {{city}} - Full city name, capitalized
      zip: extractField(body, 'zip') || body.zip || null, // {{zip}} - Zip code
      short_from: extractField(body, 'short_from') || body.short_from || null, // {{short_from}} - Outbound number with country code removed
      short_to: extractField(body, 'short_to') || body.short_to || null, // {{short_to}} - Inbound number with country code removed
      call_timezone: extractField(body, 'now', ['call_timezone']) || body.now || body.call_timezone || null, // {{now}} - Current time in call's timezone
      call_time_utc: extractField(body, 'now_utc', ['call_time_utc']) || body.now_utc || body.call_time_utc || null // {{now_utc}} - Current time in UTC
    }

    // Save call log to database
    console.log(`💾 [BLAND-WEBHOOK] Saving call log to database for call_id: ${actualCallId}`)
    const result = await createCallLog(callLogData)

    if (!result || result.length === 0) {
      console.error(`❌ [BLAND-WEBHOOK] Failed to save call log for call_id: ${actualCallId}`)
      return NextResponse.json({ 
        error: "Database error",
        message: "Failed to save call log to database"
      }, { status: 500 })
    }

    const savedCallLog = result[0]

    console.log(`✅ [BLAND-WEBHOOK] Successfully saved call log:`)
    console.log(`   - Call ID: ${savedCallLog.call_id}`)
    console.log(`   - User ID: ${savedCallLog.user_id}`)
    console.log(`   - Status: ${savedCallLog.status}`)
    console.log(`   - Duration: ${savedCallLog.duration_seconds} seconds`)

    return NextResponse.json({ 
      success: true,
      message: "Call log saved successfully",
      callId: savedCallLog.call_id,
      userId: savedCallLog.user_id,
      status: savedCallLog.status
    })

  } catch (error: any) {
    console.error("❌ [BLAND-WEBHOOK] Error processing webhook:", error)
    console.error("❌ [BLAND-WEBHOOK] Error stack:", error.stack)
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message || "An unexpected error occurred while processing webhook"
    }, { status: 500 })
  }
}