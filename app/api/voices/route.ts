import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { createDatabaseClient } from "@/lib/db-client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = createDatabaseClient()

    try {
      await client.connect()

      const voiceId = request.nextUrl.searchParams.get("voice_id")

      if (voiceId) {
        const result = await client.query(
          `SELECT id, name, description, voice_id, tags, gender
           FROM voices
           WHERE voice_id = $1
           LIMIT 1`,
          [voiceId],
        )

        const row = result.rows[0]
        if (!row) {
          return NextResponse.json({ error: "Voice not found" }, { status: 404 })
        }

        return NextResponse.json({
          voice: {
            id: row.id,
            name: row.name,
            description: row.description,
            voiceId: row.voice_id,
            tags: row.tags || [],
            gender: row.gender,
          },
        })
      }

      const result = await client.query(
        `SELECT id, name, description, voice_id, tags, gender
         FROM voices
         ORDER BY name ASC`,
      )

      return NextResponse.json({
        voices: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          voiceId: row.voice_id,
          tags: row.tags || [],
          gender: row.gender,
        })),
      })
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("❌ [VOICES] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
