import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getSSLConfig } from "@/lib/db-client"
import { encryptString } from "@/lib/encryption"

export const dynamic = "force-dynamic"

function validateConfigInput(body: any) {
  const nickname = (body?.nickname || "").trim()
  const pixelId = (body?.pixel_id || "").trim()
  const accessToken = (body?.access_token || "").trim()
  const eventName = (body?.event_name || "").trim()

  if (!nickname || !pixelId || !accessToken || !eventName) {
    return {
      ok: false,
      message: "nickname, pixel_id, access_token, and event_name are required"
    }
  }

  return {
    ok: true,
    nickname,
    pixelId,
    accessToken,
    eventName
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await client.connect()
    try {
      const result = await client.query(
        `
        SELECT id, nickname, pixel_id, event_name, created_at
        FROM meta_capi_configs
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [user.id]
      )

      return NextResponse.json({ configs: result.rows })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("[META-CAPI-CONFIGS] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch configs", details: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateConfigInput(body)

    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await client.connect()
    try {
      const result = await client.query(
        `
        INSERT INTO meta_capi_configs (
          user_id,
          nickname,
          pixel_id,
          access_token,
          access_token_enc,
          event_name,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, nickname, pixel_id, event_name, created_at
        `,
        [
          user.id,
          validation.nickname,
          validation.pixelId,
          validation.accessToken,
          encryptString(validation.accessToken),
          validation.eventName
        ]
      )

      return NextResponse.json({ config: result.rows[0] }, { status: 201 })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("[META-CAPI-CONFIGS] POST error:", error)
    return NextResponse.json(
      { error: "Failed to create config", details: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}
