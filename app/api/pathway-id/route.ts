
import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { hashPhoneNumber } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"

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
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await client.connect()

    const normalizedPhone = toE164Format(phoneNumber)
    const phoneHash = hashPhoneNumber(normalizedPhone)
    const result = await client.query(
      "SELECT pathway_id FROM phone_numbers WHERE user_id = $2 AND (phone_number_hash = $1 OR phone_number = $3)",
      [phoneHash, user.id, normalizedPhone]
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
