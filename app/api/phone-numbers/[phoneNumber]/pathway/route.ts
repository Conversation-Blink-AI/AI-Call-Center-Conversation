
import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

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

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(`
      SELECT p.*, pn.phone_number 
      FROM pathways p 
      JOIN phone_numbers pn ON p.id = pn.pathway_id 
      WHERE pn.phone_number = $1 AND pn.user_id = $2
    `, [phoneNumber, user.id])

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
