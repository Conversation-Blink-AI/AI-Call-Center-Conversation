import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import crypto from "crypto"
import { getSSLConfig } from "@/lib/db-client"

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
        SELECT pixel_id, access_token, event_name
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
    const userData: Record<string, string | string[]> = {
      ph: [phoneHash]
    }
    if (ip) {
      userData.client_ip_address = ip
    }
    if (userAgent) {
      userData.client_user_agent = userAgent
    }

    const payload = {
      data: [
        {
          event_name: config.event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: callId,
          action_source: "phone_call",
          user_data: userData
        }
      ]
    }

    const metaUrl = `https://graph.facebook.com/v18.0/${config.pixel_id}/events?access_token=${config.access_token}`
    const metaResponse = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const metaJson = await metaResponse.json()

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
