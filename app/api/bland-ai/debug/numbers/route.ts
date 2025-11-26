
import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

export async function GET() {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(
      "SELECT * FROM phone_numbers WHERE user_id = $1",
      [user.value.id]
    )

    await client.end()

    return NextResponse.json({ 
      success: true, 
      phoneNumbers: result.rows,
      count: result.rows.length 
    })
  } catch (error) {
    console.error("Error fetching debug numbers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
