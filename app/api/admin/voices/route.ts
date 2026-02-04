import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      let query = `
        SELECT id, name, description, voice_id, tags
        FROM voices
      `
      const values: string[] = []

      if (search) {
        query += `
          WHERE name ILIKE $1
             OR description ILIKE $1
             OR voice_id ILIKE $1
             OR array_to_string(tags, ' ') ILIKE $1
        `
        values.push(`%${search}%`)
      }

      query += ` ORDER BY name ASC`

      const result = await client.query(query, values)

      return NextResponse.json({
        success: true,
        voices: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          voiceId: row.voice_id,
          tags: row.tags || []
        }))
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-VOICES] Error:", error)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json()
    const { name, description, voiceId, tags } = body

    const trimmedName = typeof name === "string" ? name.trim() : ""
    const trimmedDescription = typeof description === "string" ? description.trim() : ""
    const trimmedVoiceId = typeof voiceId === "string" ? voiceId.trim() : ""
    const normalizedTags = Array.isArray(tags)
      ? tags.map((tag: string) => `${tag}`.trim()).filter(Boolean)
      : []

    if (!trimmedName || !trimmedDescription || !trimmedVoiceId || normalizedTags.length === 0) {
      return NextResponse.json(
        { error: "name, description, voiceId, and tags are required" },
        { status: 400 }
      )
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      const result = await client.query(
        `INSERT INTO voices (name, description, voice_id, tags)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, voice_id, tags`,
        [trimmedName, trimmedDescription, trimmedVoiceId, normalizedTags]
      )

      const voice = result.rows[0]

      return NextResponse.json({
        success: true,
        voice: {
          id: voice.id,
          name: voice.name,
          description: voice.description,
          voiceId: voice.voice_id,
          tags: voice.tags || []
        }
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [ADMIN-VOICES] Error:", error)
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized: No authenticated user") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
