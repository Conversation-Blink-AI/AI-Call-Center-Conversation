import { NextRequest, NextResponse } from "next/server"
import { createLanderEvent } from "@/lib/db-utils"
import { mapLanderWebhookToEvent } from "@/lib/lander-webhook-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.LANDER_WEBHOOK_SECRET
  if (!configuredSecret) return true

  const headerSecret = request.headers.get("x-lander-webhook-secret")
  const authorization = request.headers.get("authorization")
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null

  return headerSecret === configuredSecret || bearerToken === configuredSecret
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/lander",
    method: "POST",
    auth: process.env.LANDER_WEBHOOK_SECRET ? "shared-secret" : "not-configured",
    acceptedSecretHeaders: ["x-lander-webhook-secret", "authorization: Bearer <secret>"],
    expectedFields: {
      meta: [
        "ad_id",
        "ad_set_id",
        "campaign_id",
        "ad_name",
        "ad_set_name",
        "campaign_name",
        "placement",
        "site_source_name",
        "fbclid",
      ],
      visitor: [
        "user_agent",
        "device",
        "ip",
        "os",
        "browser",
        "ip_confidence",
        "risk_flags",
        "city",
        "network_provider",
        "connection_type",
        "network_type",
        "country",
        "region",
        "isp",
        "asn",
        "click_time",
      ],
    },
  })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
  }

  const eventData = mapLanderWebhookToEvent(body)

  try {
    const result = await createLanderEvent(eventData)
    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Failed to save lander event" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Lander event saved",
      id: result[0].id,
    })
  } catch (error: unknown) {
    console.error("[LANDER-WEBHOOK] Failed to save event:", error)
    const message = error instanceof Error ? error.message : "Failed to process lander webhook"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
