import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')

    if (!callId) {
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(`
      SELECT ch.*, pn.phone_number 
      FROM call_history ch 
      JOIN phone_numbers pn ON ch.phone_number_id = pn.id 
      WHERE ch.call_id = $1 AND pn.user_id = $2
    `, [callId, user.value.id])

    await client.end()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      callSummary: result.rows[0] 
    })
  } catch (error) {
    console.error("Error fetching call summary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}