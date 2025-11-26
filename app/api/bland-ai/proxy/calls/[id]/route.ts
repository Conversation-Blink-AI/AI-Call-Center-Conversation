
import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const callId = params.id

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
      call: result.rows[0] 
    })
  } catch (error) {
    console.error("Error fetching call:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
