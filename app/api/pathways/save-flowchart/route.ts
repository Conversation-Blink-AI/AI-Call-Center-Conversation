
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateAuthToken } from "@/lib/auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { hashPhoneNumber } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the token
    const authResult = await validateAuthToken(token)
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = authResult.user.id
    const body = await request.json()
    const { phoneNumber, flowchartData } = body

    if (!phoneNumber || !flowchartData) {
      return NextResponse.json({ 
        error: "Phone number and flowchart data are required" 
      }, { status: 400 })
    }

    const formattedPhone = toE164Format(phoneNumber)
    const phoneHash = hashPhoneNumber(formattedPhone)

    console.log(`[SAVE-FLOWCHART] Saving pathway for phone ${formattedPhone} and user ${userId}`)

    // Update the data column (JSONB) in pathways table
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()
      
      const updateResult = await client.query(`
        WITH matched_phone AS (
          SELECT id
          FROM phone_numbers
          WHERE user_id = $2
            AND (phone_number_hash = $3 OR phone_number = $4)
          LIMIT 1
        )
        UPDATE pathways p
        SET data = $1, updated_at = NOW()
        FROM matched_phone mp
        WHERE p.phone_id = mp.id
          AND p.creator_id = $2
        RETURNING p.id, p.name, p.updated_at
      `, [JSON.stringify(flowchartData), userId, phoneHash, formattedPhone])

      if (updateResult.rows.length === 0) {
        await client.end()
        return NextResponse.json({ 
          error: "Pathway not found for this phone number or not owned by user" 
        }, { status: 404 })
      }

      const pathway = updateResult.rows[0]

      console.log(`[SAVE-FLOWCHART] Successfully saved pathway: ${pathway.name}`)

      return NextResponse.json({
        success: true,
        pathway: {
          id: pathway.id,
          name: pathway.name,
          updated_at: pathway.updated_at
        }
      })
    } finally {
      await client.end()
    }


  } catch (error) {
    console.error("[SAVE-FLOWCHART] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
