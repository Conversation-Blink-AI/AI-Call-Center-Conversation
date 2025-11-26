
import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, flowchartData } = await request.json()

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(`
      INSERT INTO pathways (name, description, flowchart_data, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [name, "Test flowchart", JSON.stringify(flowchartData), user.value.id])

    await client.end()

    return NextResponse.json({ 
      success: true, 
      pathway: result.rows[0] 
    })
  } catch (error) {
    console.error("Error saving test flowchart:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
