
import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request as NextRequest)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phoneNumber')

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(
      "SELECT pathway_id FROM phone_numbers WHERE phone_number = $1 AND user_id = $2",
      [phoneNumber, user.id]
    )

    await client.end()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    return NextResponse.json({ pathwayId: result.rows[0].pathway_id })
  } catch (error) {
    console.error("Error fetching pathway ID:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
