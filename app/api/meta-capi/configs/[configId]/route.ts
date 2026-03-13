import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getSSLConfig } from "@/lib/db-client"
import { encryptString } from "@/lib/encryption"

export const dynamic = "force-dynamic"

function buildUpdateQuery(fields: Record<string, string>) {
  const keys = Object.keys(fields)
  const setClauses = keys.map((key, index) => `${key} = $${index + 3}`)
  return {
    setClause: setClauses.join(", "),
    values: keys.map((key) => fields[key])
  }
}

export async function PATCH(request: NextRequest, context: { params: { configId: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { configId } = context.params
    const body = await request.json()

    const updateFields: Record<string, string> = {}
    if (typeof body.nickname === "string" && body.nickname.trim()) {
      updateFields.nickname = body.nickname.trim()
    }
    if (typeof body.pixel_id === "string" && body.pixel_id.trim()) {
      updateFields.pixel_id = body.pixel_id.trim()
    }
    if (typeof body.event_name === "string" && body.event_name.trim()) {
      updateFields.event_name = body.event_name.trim()
    }
    if (typeof body.access_token === "string" && body.access_token.trim()) {
      const accessToken = body.access_token.trim()
      updateFields.access_token = accessToken
      updateFields.access_token_enc = encryptString(accessToken)
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await client.connect()
    try {
      const { setClause, values } = buildUpdateQuery(updateFields)
      const result = await client.query(
        `
        UPDATE meta_capi_configs
        SET ${setClause}
        WHERE id = $1 AND user_id = $2
        RETURNING id, nickname, pixel_id, event_name, created_at
        `,
        [configId, user.id, ...values]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Config not found" }, { status: 404 })
      }

      return NextResponse.json({ config: result.rows[0] })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("[META-CAPI-CONFIG] PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update config", details: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: { params: { configId: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { configId } = context.params
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await client.connect()
    try {
      const result = await client.query(
        `
        DELETE FROM meta_capi_configs
        WHERE id = $1 AND user_id = $2
        RETURNING id
        `,
        [configId, user.id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Config not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("[META-CAPI-CONFIG] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete config", details: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}
