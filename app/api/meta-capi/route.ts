import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const dynamic = "force-dynamic"

/**
 * SHA-256 hash function for PII (phone numbers, emails)
 */
function sha256Hash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

/**
 * Normalize phone number - trim whitespace and ensure proper format
 */
function normalizePhone(phone: string): string {
  return phone.trim()
}

/**
 * GET endpoint for health check and testing
 */
export async function GET(request: NextRequest) {
  const hasAccessToken = !!process.env.META_CAPI_ACCESS_TOKEN
  const hasPixelId = !!process.env.META_PIXEL_ID

  return NextResponse.json({
    status: "ok",
    message: "Meta CAPI webhook endpoint is active",
    endpoint: "/api/meta-capi",
    method: "POST",
    timestamp: new Date().toISOString(),
    configuration: {
      hasAccessToken,
      hasPixelId,
      defaultPixelId: process.env.META_PIXEL_ID || "not configured"
    },
    instructions: {
      webhook_url: "Configure this URL in Bland.ai webhook node",
      method: "POST",
      content_type: "application/json",
      required_fields: ["phone"],
      optional_fields: ["event_name", "event_id", "action_source", "email", "user_agent", "ip", "pixel_id"]
    }
  })
}

/**
 * Meta Conversions API (CAPI) Webhook Endpoint
 * 
 * Receives webhook calls from Bland.ai webhook nodes, hashes PII (phone/email),
 * and forwards events to Meta's Conversions API v18.0
 * 
 * Expected Request Body:
 * {
 *   "event_name": "CallLead",
 *   "event_id": "{{call_id}}",
 *   "action_source": "phone_call",
 *   "phone": "{{from}}",
 *   "email": "{{email}}",
 *   "user_agent": "{{user_agent}}",
 *   "ip": "{{ip}}",
 *   "pixel_id": "499073848448643" // optional, defaults to META_PIXEL_ID env var
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔔 [META-CAPI] ==================== META CAPI WEBHOOK CALLED ====================")
    console.log("🔔 [META-CAPI] Timestamp:", new Date().toISOString())

    // Check for access token
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN
    if (!accessToken) {
      console.error("❌ [META-CAPI] META_CAPI_ACCESS_TOKEN not configured")
      return NextResponse.json(
        {
          ok: false,
          error: "Server configuration error",
          message: "Meta CAPI access token not configured"
        },
        { status: 500 }
      )
    }

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (jsonError: any) {
      console.error("❌ [META-CAPI] JSON parsing error:", jsonError)
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON payload",
          message: jsonError.message || "Failed to parse request body as JSON"
        },
        { status: 400 }
      )
    }

    console.log("🔔 [META-CAPI] Received webhook payload:", JSON.stringify(body, null, 2))

    // Extract required fields
    const phone = body.phone
    if (!phone) {
      console.error("❌ [META-CAPI] Missing required field: phone")
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required field",
          message: "phone is required"
        },
        { status: 400 }
      )
    }

    // Extract optional fields
    const eventName = body.event_name || "CallLead"
    const eventId = body.event_id || `calllead_${Date.now()}`
    const actionSource = body.action_source || "phone_call"
    const email = body.email
    const userAgent = body.user_agent
    const ip = body.ip
    const pixelId = body.pixel_id || process.env.META_PIXEL_ID

    if (!pixelId) {
      console.error("❌ [META-CAPI] Pixel ID not configured and not provided in request")
      return NextResponse.json(
        {
          ok: false,
          error: "Pixel ID not configured",
          message: "Pixel ID must be provided in request body or META_PIXEL_ID environment variable"
        },
        { status: 400 }
      )
    }

    // Normalize and hash phone number
    const normalizedPhone = normalizePhone(phone)
    const phoneHash = sha256Hash(normalizedPhone)
    console.log("🔔 [META-CAPI] Phone normalized:", normalizedPhone)
    console.log("🔔 [META-CAPI] Phone hashed (first 10 chars):", phoneHash.substring(0, 10) + "...")

    // Hash email if provided
    let emailHash: string | undefined
    if (email) {
      emailHash = sha256Hash(email)
      console.log("🔔 [META-CAPI] Email hashed (first 10 chars):", emailHash.substring(0, 10) + "...")
    }

    // Build user_data object
    const userData: any = {
      ph: [phoneHash] // Meta expects array of hashed phone numbers
    }

    if (emailHash) {
      userData.em = [emailHash] // Meta expects array of hashed emails
    }

    if (ip) {
      userData.client_ip_address = ip
    }

    if (userAgent) {
      userData.client_user_agent = userAgent
    }

    // Build Meta CAPI payload
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: actionSource,
          user_data: userData
        }
      ]
    }

    console.log("🔔 [META-CAPI] Sending to Meta CAPI:")
    console.log("   - Pixel ID:", pixelId)
    console.log("   - Event Name:", eventName)
    console.log("   - Event ID:", eventId)
    console.log("   - Action Source:", actionSource)

    // Forward to Meta Conversions API
    const metaUrl = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`
    
    const metaResponse = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })

    const metaJson = await metaResponse.json()

    if (!metaResponse.ok) {
      console.error("❌ [META-CAPI] Meta API error:", metaResponse.status, metaJson)
      return NextResponse.json(
        {
          ok: false,
          error: "Meta API error",
          message: `Meta API returned status ${metaResponse.status}`,
          meta_response: metaJson
        },
        { status: metaResponse.status }
      )
    }

    console.log("✅ [META-CAPI] Successfully sent event to Meta CAPI")
    console.log("✅ [META-CAPI] Meta response:", JSON.stringify(metaJson, null, 2))

    return NextResponse.json({
      ok: true,
      sent_to_meta: payload,
      meta_response: metaJson
    })

  } catch (error: any) {
    console.error("❌ [META-CAPI] Error processing webhook:", error)
    console.error("❌ [META-CAPI] Error stack:", error.stack)
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        message: error.message || "An unexpected error occurred while processing webhook"
      },
      { status: 500 }
    )
  }
}

