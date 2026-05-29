import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db-client"

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

    const pool = getPool()
    // Single query: user + phone numbers via LEFT JOIN (one round-trip, no new connection if pool warm)
    const result = await pool.query(
      `SELECT
        u.id as user_id,
        u.first_name,
        u.last_name,
        pn.id as pn_id,
        pn.phone_number as number,
        pn.location,
        pn.area_code,
        pn.country_code,
        pn.purchased_at,
        pn.user_id as pn_user_id,
        pn.monthly_fee,
        pn.status,
        pn.type
       FROM users u
       LEFT JOIN phone_numbers pn ON pn.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)
       ORDER BY pn.purchased_at DESC NULLS LAST`,
      [email.trim()]
    )

    const rows = result.rows
    if (rows.length === 0 || rows[0].user_id == null) {
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

    const user = rows[0]
    const phoneNumbers = rows
      .filter((row) => row.pn_id != null)
      .map((row) => ({
        id: row.pn_id,
        number: row.number ? String(row.number).trim() : '',
        status: row.status || 'active',
        location: row.location || 'Unknown',
        area_code: row.area_code || null,
        country_code: row.country_code || null,
        type: row.type || 'Local',
        purchased_at: row.purchased_at,
        user_id: row.pn_user_id,
        monthly_fee: row.monthly_fee != null ? parseFloat(row.monthly_fee) : 1.5,
        pathway_id: null,
        pathway_name: null
      }))

    console.log(`[GET-PURCHASE-NUMBER] Found ${phoneNumbers.length} phone numbers for user ${user.user_id}`)

    return NextResponse.json({
      success: true,
      userId: user.user_id,
      email: email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
      phoneNumbers,
      count: phoneNumbers.length
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

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
