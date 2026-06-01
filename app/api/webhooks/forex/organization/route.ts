import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { syncForexOrganizationWebhook } from "@/lib/forex-org-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.FOREX_WEBHOOK_SECRET
  if (!configuredSecret) return true

  const headerSecret = request.headers.get("x-forex-webhook-secret")
  const authorization = request.headers.get("authorization")
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null

  return headerSecret === configuredSecret || bearerToken === configuredSecret
}

function getOrganizationPayload(body: any) {
  return body?.data || body?.organization || body
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/forex/organization",
    method: "POST",
    auth: process.env.FOREX_WEBHOOK_SECRET ? "shared-secret" : "not-configured",
    acceptedSecretHeaders: ["x-forex-webhook-secret", "authorization: Bearer <secret>"],
  })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const organizationPayload = getOrganizationPayload(body)
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
  })

  try {
    await client.connect()
    const result = await syncForexOrganizationWebhook(client, organizationPayload)

    return NextResponse.json({
      status: "success",
      message: "Organization webhook processed",
      data: result,
    })
  } catch (error: any) {
    console.error("[FOREX-ORG-WEBHOOK] Failed to process organization webhook:", error)
    return NextResponse.json({
      status: "error",
      message: error?.message || "Failed to process organization webhook",
    }, { status: 500 })
  } finally {
    await client.end().catch(() => {})
  }
}
