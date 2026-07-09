import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import type { ZodSchema } from "zod"
import { getSSLConfig } from "@/lib/db-client"
import { verifyHustleIntegrationRequest } from "@/lib/hustle-integration-auth"

export const hustleIntegrationRuntime = {
  runtime: "nodejs" as const,
  dynamic: "force-dynamic" as const,
}

type SyncHandler<T> = (client: Client, payload: T) => Promise<Record<string, unknown>>

export function createHustleIntegrationGetHandler(endpoint: string, event: string) {
  return function GET() {
    return NextResponse.json({
      status: "ok",
      endpoint,
      method: "POST",
      event,
      auth: {
        bearer: "Authorization: Bearer <SUBSCRIPTION_INTERNAL_API_TOKEN>",
        hmac: process.env.SUBSCRIPTION_INTERNAL_HMAC_SECRET
          ? "X-Hustle-Timestamp + X-Hustle-Signature (sha256=<hmac>)"
          : "not-configured",
        requestId: "X-Hustle-Request-Id",
      },
    })
  }
}

export function createHustleIntegrationPostHandler<T>(options: {
  logTag: string
  schema: ZodSchema<T>
  sync: SyncHandler<T>
}) {
  return async function POST(request: NextRequest) {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 })
    }

    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return NextResponse.json({ error: "Failed to read request body" }, { status: 400 })
    }

    const authResult = verifyHustleIntegrationRequest(request, rawBody)
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    if (authResult.requestId) {
      console.log(`[${options.logTag}] requestId=${authResult.requestId}`)
    }

    let parsedBody: unknown
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const validation = options.schema.safeParse(parsedBody)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: validation.error.flatten(),
        },
        { status: 400 },
      )
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(),
    })

    try {
      await client.connect()
      const data = await options.sync(client, validation.data)

      return NextResponse.json({
        status: "success",
        message: `${options.logTag} processed`,
        data,
      })
    } catch (error: unknown) {
      const err = error as Error & { statusCode?: number }
      console.error(`[${options.logTag}] Failed:`, err)

      return NextResponse.json(
        {
          status: "error",
          message: err?.message || `Failed to process ${options.logTag}`,
        },
        { status: err?.statusCode || 500 },
      )
    } finally {
      await client.end().catch(() => {})
    }
  }
}
