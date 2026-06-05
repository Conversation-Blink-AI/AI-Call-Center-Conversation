import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import crypto from "crypto"
import { getSSLConfig } from "@/lib/db-client"
import { decryptString } from "@/lib/encryption"

export const dynamic = "force-dynamic"

function sha256Hash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

export async function POST(request: NextRequest, context: { params: { configId: string } }) {
  try {
    const { configId } = context.params
    let body: any

    try {
      body = await request.json()
    } catch (jsonError: any) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON payload", message: jsonError.message || "Failed to parse JSON" },
        { status: 400 }
      )
    }

    const fromPhone = (body?.from || body?.phone || "").trim()
    const callId = body?.call_id || body?.event_id || `call_${Date.now()}`
    const ip = body?.ip
    const userAgent = body?.user_agent
    const testEventCode = body?.test_event_code

    if (!fromPhone) {
      return NextResponse.json(
        { ok: false, error: "Missing required field", message: "from (phone) is required" },
        { status: 400 }
      )
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await client.connect()
    let config: any
    try {
      const result = await client.query(
        `
        SELECT pixel_id, access_token, access_token_enc, event_name
        FROM meta_capi_configs
        WHERE id = $1
        LIMIT 1
        `,
        [configId]
      )
      config = result.rows[0]
    } finally {
      await client.end()
    }

    if (!config) {
      return NextResponse.json({ ok: false, error: "Config not found" }, { status: 404 })
    }

    const phoneHash = sha256Hash(fromPhone)
    const allowedUserDataKeys = new Set([
      "em",
      "ph",
      "fn",
      "ln",
      "ge",
      "db",
      "ct",
      "st",
      "zp",
      "country",
      "external_id",
      "client_ip_address",
      "client_user_agent",
      "fbc",
      "fbp",
      "subscription_id",
      "fb_login_id",
      "lead_id",
      "anon_id",
      "madid",
      "page_id",
      "page_scoped_user_id",
      "ctwa_clid",
      "ig_account_id",
      "ig_sid"
    ])
    const nonHashedKeys = new Set([
      "client_ip_address",
      "client_user_agent",
      "fbc",
      "fbp",
      "subscription_id",
      "fb_login_id",
      "lead_id",
      "anon_id",
      "madid",
      "page_id",
      "page_scoped_user_id",
      "ctwa_clid",
      "ig_account_id",
      "ig_sid"
    ])
    const arrayKeys = new Set(["em", "ph"])
    const userData: Record<string, string | string[]> = {
      ph: [phoneHash]
    }
    if (ip) {
      userData.client_ip_address = ip
    }
    if (userAgent) {
      userData.client_user_agent = userAgent
    }

    userData.external_id = callId

    const extraUserData = body?.user_data && typeof body.user_data === "object" ? body.user_data : null
    if (extraUserData) {
      Object.entries(extraUserData).forEach(([key, rawValue]) => {
        if (!allowedUserDataKeys.has(key)) return
        const values = Array.isArray(rawValue) ? rawValue : [rawValue]
        const cleanedValues = values
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value)
          .map((value) => (nonHashedKeys.has(key) ? value : sha256Hash(value)))

        if (cleanedValues.length === 0) return
        if (arrayKeys.has(key)) {
          const current = Array.isArray(userData[key]) ? (userData[key] as string[]) : []
          const merged = Array.from(new Set([...current, ...cleanedValues]))
          userData[key] = merged
          return
        }

        userData[key] = cleanedValues[0]
      })
    }

    const customData = body?.custom_data && typeof body.custom_data === "object" ? body.custom_data : null

    const payload: any = {
      data: [
        {
          event_name: config.event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: callId,
          action_source: "phone_call",
          user_data: userData,
          ...(customData ? { custom_data: customData } : {})
        }
      ]
    }
    if (testEventCode) {
      payload.test_event_code = testEventCode
    }

    const accessToken = config.access_token_enc
      ? decryptString(config.access_token_enc)
      : config.access_token
    const metaUrl = `https://graph.facebook.com/v18.0/${config.pixel_id}/events?access_token=${accessToken}`
    const startMs = Date.now()
    const metaResponse = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const metaJson = await metaResponse.json()
    const durationMs = Date.now() - startMs

    try {
      const logClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: getSSLConfig()
      })
      await logClient.connect()
      try {
        await logClient.query(
          `
          INSERT INTO meta_capi_events (
            call_id, config_id, event_name, request_payload, response_payload,
            response_status, duration_ms, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `,
          [
            callId,
            configId,
            config.event_name,
            payload,
            metaJson,
            metaResponse.status,
            durationMs
          ]
        )
      } finally {
        await logClient.end()
      }
    } catch (logError: any) {
      console.error("❌ [META-CAPI-CONFIG-WEBHOOK] Failed to log event:", logError)
    }

    if (!metaResponse.ok) {
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

    return NextResponse.json({
      ok: true,
      meta_response: metaJson
    })
  } catch (error: any) {
    console.error("❌ [META-CAPI-CONFIG-WEBHOOK] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Internal server error", message: error.message || "Unexpected error" },
      { status: 500 }
    )
  }
}
