import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

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
    })

    await pgClient.connect()

    try {
      // Format the phone number consistently (remove all non-digits first)
      const cleanPhone = phone.replace(/\D/g, '')
      // Only add +1 if it doesn't already start with 1
      const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`

      console.log(`[LOOKUP-PATHWAY] Looking up pathway for phone: ${formattedPhone}`)

      // Query for the phone number and its associated pathway
      const phoneQuery = `
        SELECT 
          pn.id,
          pn.phone_number,
          pn.pathway_id,
          p.name as pathway_name,
          p.description as pathway_description,
          p.updated_at as last_deployed_at
        FROM phone_numbers pn
        LEFT JOIN pathways p ON pn.pathway_id = p.id
        WHERE pn.phone_number = $1 AND pn.user_id = $2
      `

      const result = await pgClient.query(phoneQuery, [formattedPhone, user.id])

      if (result.rows.length === 0) {
        console.log(`[LOOKUP-PATHWAY] No phone number found for ${formattedPhone}`)
        return NextResponse.json({
          success: false,
          message: 'Phone number not found or not owned by user'
        })
      }

      const phoneData = result.rows[0]

      if (!phoneData.pathway_id) {
        console.log(`[LOOKUP-PATHWAY] Phone number ${formattedPhone} has no pathway assigned`)
        return NextResponse.json({
          success: false,
          message: 'No pathway assigned to this phone number'
        })
      }

      console.log(`[LOOKUP-PATHWAY] Found pathway ${phoneData.pathway_id} for phone ${formattedPhone}`)

      return NextResponse.json({
        success: true,
        pathway_id: phoneData.pathway_id,
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