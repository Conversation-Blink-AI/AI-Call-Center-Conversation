import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { hashPhoneNumber } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"

export async function GET(request: NextRequest) {
  try {
    // Get the phone number from the query string
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Verify authentication using getUserFromRequest
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Connect to PostgreSQL
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    await pgClient.connect()

    try {
      const formattedPhone = toE164Format(phone)
      const phoneHash = hashPhoneNumber(formattedPhone)

      console.log(`[LOOKUP-PATHWAY] Looking up pathway for phone: ${formattedPhone}`)

      // Query for the phone number and its associated pathway
      // The relationship is: pathways.phone_id -> phone_numbers.id
      const phoneQuery = `
        SELECT 
          pn.id,
          pn.phone_number,
          pn.pathwayid,
          p.id as pathway_id_from_phone,
          p.bland_id as pathway_bland_id,
          p.name as pathway_name,
          p.description as pathway_description,
          p.updated_at as last_deployed_at
        FROM phone_numbers pn
        LEFT JOIN pathways p ON p.phone_id = pn.id
        WHERE pn.user_id = $2 AND (pn.phone_number_hash = $1 OR pn.phone_number = $3)
      `

      const result = await pgClient.query(phoneQuery, [phoneHash, user.id, formattedPhone])

      if (result.rows.length === 0) {
        console.log(`[LOOKUP-PATHWAY] No phone number found for ${formattedPhone}`)
        return NextResponse.json({
          success: false,
          message: 'Phone number not found or not owned by user'
        })
      }

      const phoneData = result.rows[0]

      // Same resolution as /api/user/phone-numbers: Bland pathway ID first (what runs on Bland),
      // not the local pathways.id UUID — otherwise deploy/update hits the wrong pathway.
      const pathwayId =
        phoneData.pathwayid ||
        phoneData.pathway_bland_id ||
        phoneData.pathway_id_from_phone

      if (!pathwayId) {
        console.log(`[LOOKUP-PATHWAY] Phone number ${formattedPhone} has no pathway assigned`)
        return NextResponse.json({
          success: false,
          message: 'No pathway assigned to this phone number'
        })
      }

      console.log(`[LOOKUP-PATHWAY] Found pathway ${pathwayId} for phone ${formattedPhone}`)

      return NextResponse.json({
        success: true,
        pathway_id: pathwayId,
        pathway_name: phoneData.pathway_name,
        pathway_description: phoneData.pathway_description,
        last_deployed_at: phoneData.last_deployed_at,
        phone_number: phoneData.phone_number
      })

    } finally {
      await pgClient.end()
    }

  } catch (error) {
    console.error('[LOOKUP-PATHWAY] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}