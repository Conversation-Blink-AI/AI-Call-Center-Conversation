
import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { hashPhoneNumber } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"

export async function GET(
  request: Request,
  { params }: { params: { phoneNumber: string } }
) {
  try {
    const user = await getUserFromRequest(request as NextRequest)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const phoneNumber = params.phoneNumber
    const normalizedPhone = toE164Format(phoneNumber)
    const phoneHash = hashPhoneNumber(normalizedPhone)

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await client.connect()

    const result = await client.query(`
      SELECT p.*, pn.phone_number 
      FROM pathways p 
      JOIN phone_numbers pn ON p.phone_id = pn.id 
      WHERE pn.user_id = $2 AND (pn.phone_number_hash = $1 OR pn.phone_number = $3)
    `, [phoneHash, user.id, normalizedPhone])

    await client.end()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Pathway not found for this phone number" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      pathway: result.rows[0] 
    })
  } catch (error) {
    console.error("Error fetching pathway:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
