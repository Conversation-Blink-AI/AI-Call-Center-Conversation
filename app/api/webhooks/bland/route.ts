import { NextRequest, NextResponse } from "next/server"
import { findUserByPhoneNumber } from "@/lib/phone-number-lookup"
import { createCallLog } from "@/lib/db-utils"
import { mapBlandWebhookToCallLog } from "@/lib/bland-webhook-utils"
import { toE164Format } from "@/utils/phone-utils"

export const dynamic = "force-dynamic"

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
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔔 [BLAND-WEBHOOK] ==================== BLAND WEBHOOK CALLED ====================")
    console.log("🔔 [BLAND-WEBHOOK] Timestamp:", new Date().toISOString())

    let body: any
    try {
      body = await request.json()
    } catch (jsonError: any) {
      console.error("❌ [BLAND-WEBHOOK] JSON parsing error:", jsonError)
      return NextResponse.json({
        error: "Invalid JSON payload",
        message: jsonError.message || "Failed to parse request body as JSON"
      }, { status: 400 })
    }

    console.log("🔔 [BLAND-WEBHOOK] Received webhook payload keys:", Object.keys(body || {}))

    const actualCallId = body.call_id || body.c_id || body.id
    if (!actualCallId) {
      return NextResponse.json({
        error: "Missing call_id",
        message: "Webhook payload must contain call_id, c_id, or id field"
      }, { status: 400 })
    }

    const fromNumber =
      body.from || body.from_number || body.fromNumber || body.variables?.from
    const toNumber =
      body.to || body.to_number || body.toNumber || body.variables?.to

    if (!fromNumber && !toNumber) {
      return NextResponse.json({
        error: "Missing phone numbers",
        message: "Webhook payload must contain from/from_number or to/to_number fields"
      }, { status: 400 })
    }

    const userLookup = await findUserByPhoneNumber(fromNumber, toNumber)
    if (!userLookup) {
      console.log(`⚠️ [BLAND-WEBHOOK] User not found for from=${fromNumber}, to=${toNumber}`)
      return NextResponse.json({
        success: false,
        error: "User not found",
        message: `No registered user found for phone numbers: from=${fromNumber}, to=${toNumber}`,
        callId: actualCallId,
        note: "Call logged but not saved - user not registered"
      }, { status: 200 })
    }

    const callLogData = mapBlandWebhookToCallLog(
      body,
      userLookup.user_id,
      userLookup.phone_number_id || null
    )

    callLogData.from_number = callLogData.from_number
      ? toE164Format(callLogData.from_number)
      : ""
    callLogData.to_number = callLogData.to_number
      ? toE164Format(callLogData.to_number)
      : ""

    console.log(`💾 [BLAND-WEBHOOK] Saving call log for call_id: ${actualCallId}`)
    console.log(`   - Transcript length: ${callLogData.transcript?.length ?? 0}`)
    const result = await createCallLog(callLogData)

    if (!result || result.length === 0) {
      return NextResponse.json({
        error: "Database error",
        message: "Failed to save call log to database"
      }, { status: 500 })
    }

    const savedCallLog = result[0]
    console.log(`✅ [BLAND-WEBHOOK] Saved call log: ${savedCallLog.call_id}`)

    return NextResponse.json({
      success: true,
      message: "Call log saved successfully",
      callId: savedCallLog.call_id,
      userId: savedCallLog.user_id,
      status: savedCallLog.status,
      hasTranscript: Boolean(savedCallLog.transcript || savedCallLog.transcript_enc)
    })
  } catch (error: any) {
    console.error("❌ [BLAND-WEBHOOK] Error processing webhook:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: error.message || "An unexpected error occurred while processing webhook"
    }, { status: 500 })
  }
}
