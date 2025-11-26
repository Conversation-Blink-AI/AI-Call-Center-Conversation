import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phoneNumber, pathwayId } = await request.json()

    if (!phoneNumber || !pathwayId) {
      return NextResponse.json({ error: "Phone number and pathway ID are required" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    // Insert the purchased phone number
    await client.query(`
      INSERT INTO phone_numbers (phone_number, user_id, pathway_id, status, created_at)
      VALUES ($1, $2, $3, 'active', NOW())
    `, [phoneNumber, user.value.id, pathwayId])

    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: "Phone number purchased successfully" 
    })
  } catch (error) {
    console.error("Error confirming purchase:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}