
import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({
        success: false,
        message: "Email parameter is required"
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    console.log(`[GET-PURCHASE-NUMBER] Looking up phone numbers for email: ${email}`)

    if (!process.env.DATABASE_URL) {
      console.error("[GET-PURCHASE-NUMBER] DATABASE_URL is not set")
      return NextResponse.json({
        success: false,
        message: "Database configuration error"
      }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // First, find the user by email
      const userResult = await client.query(
        'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
        [email]
      )

      if (userResult.rows.length === 0) {
        console.log(`[GET-PURCHASE-NUMBER] User not found for email: ${email}`)
        return NextResponse.json({
          success: false,
          message: "User not found",
          email: email,
          phoneNumbers: [],
          count: 0
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
      }

      const user = userResult.rows[0]
      console.log(`[GET-PURCHASE-NUMBER] User found: ${user.id}`)

      // Get all phone numbers for this user
      // Simplified query - pathway info can be added via JOIN if needed
      const phoneResult = await client.query(
        `SELECT 
          pn.id,
          pn.phone_number as number,
          pn.location,
          pn.purchased_at,
          pn.user_id,
          pn.monthly_fee,
          pn.status,
          pn.type
         FROM phone_numbers pn
         WHERE pn.user_id = $1
         ORDER BY pn.purchased_at DESC`,
        [user.id]
      )

      const phoneNumbers = phoneResult.rows.map(row => ({
        id: row.id,
        number: row.number ? row.number.trim() : '',
        status: row.status || 'active',
        location: row.location || 'Unknown',
        type: row.type || 'Local',
        purchased_at: row.purchased_at,
        user_id: row.user_id,
        monthly_fee: row.monthly_fee ? parseFloat(row.monthly_fee) : 1.50,
        pathway_id: null,
        pathway_name: null
      }))

      console.log(`[GET-PURCHASE-NUMBER] Found ${phoneNumbers.length} phone numbers for user ${user.id}`)

      return NextResponse.json({
        success: true,
        email: email,
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
        phoneNumbers: phoneNumbers,
        count: phoneNumbers.length
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })

    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[GET-PURCHASE-NUMBER] Error:", error)
    const errorMessage = error?.message || "Internal server error"
    const errorDetails = process.env.NODE_ENV === 'development' ? errorMessage : undefined
    
    return NextResponse.json({
      success: false,
      message: "Internal server error",
      ...(errorDetails && { error: errorDetails })
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }
}
