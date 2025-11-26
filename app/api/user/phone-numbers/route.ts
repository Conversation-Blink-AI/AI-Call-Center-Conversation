import { NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"
import { Client } from "pg"

export async function GET(request: Request) {
  try {
    // Authenticate user using the same method as proxy/calls
    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      console.log("🚨 [USER-PHONE-NUMBERS] Authentication failed")
      return NextResponse.json({ 
        success: false, 
        message: "Unauthorized" 
      }, { status: 401 })
    }

    const user = authResult.user
    const userId = user.id

    console.log("🔍 [USER-PHONE-NUMBERS] Fetching phone numbers for authenticated user:", userId)

    // Use PostgreSQL with RLS to fetch phone numbers
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()

      // Set user context for RLS
      await client.query(`SET app.current_user_id = '${userId}'`)

      const result = await client.query(
        `SELECT 
          pn.id,
          pn.phone_number as number,
          pn.location,
          pn.purchased_at as created_at,
          pn.user_id,
          pn.monthly_fee,
          pn.type,
          pn.status,
          pn.assigned_to,
          pn.pathway_id
         FROM phone_numbers pn
         WHERE pn.user_id = $1
         ORDER BY pn.purchased_at DESC`,
        [userId]
      )

      const phoneNumbers = result.rows.map(row => ({
        id: row.id,
        number: row.number.trim(), // Clean any whitespace
        status: row.status || 'Active',
        location: row.location || 'Unknown',
        type: row.type || 'Local',
        created_at: row.created_at,
        purchased_at: row.created_at,
        user_id: row.user_id,
        monthly_fee: parseFloat(row.monthly_fee) || 1.50,
        assigned_to: row.assigned_to || 'Unassigned',
        pathway_id: row.pathway_id,
        pathway_name: row.pathway_id ? `Pathway ${row.pathway_id}` : null, // Generate name from ID
        pathway_description: row.pathway_id ? `Pathway configuration for ${row.pathway_id}` : null
      }))

      console.log("✅ [USER-PHONE-NUMBERS] Fetched from PostgreSQL:", phoneNumbers.length, "numbers for user", userId)

      return NextResponse.json({
        success: true,
        phoneNumbers
      })
    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[USER-PHONE-NUMBERS] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📱 [ADD-PHONE-NUMBER] Starting request...")

    const body = await request.json()
    const { phoneNumber, userId, location, type, pathwayId } = body

    if (!phoneNumber || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: "Phone number and user ID are required" 
      }, { status: 400 })
    }

    console.log("📱 [ADD-PHONE-NUMBER] Adding phone number:", {
      phoneNumber,
      userId,
      location,
      type,
      pathwayId
    })

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()
      const result = await client.query(
        `INSERT INTO phone_numbers (phone_number, user_id, location, type, assigned_to, purchased_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (phone_number) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           location = EXCLUDED.location,
           type = EXCLUDED.type,
           assigned_to = EXCLUDED.assigned_to
         RETURNING *`,
        [
          phoneNumber,
          userId,
          location || 'Unknown',
          type || 'Local',
          'Unassigned'
        ]
      )

      const savedPhone = result.rows[0]
      console.log("✅ [ADD-PHONE-NUMBER] Phone number added:", savedPhone)

      return NextResponse.json({
          success: true,
          message: "Phone number added successfully",
          data: {
            phoneNumber: savedPhone.phone_number,
            userId: savedPhone.user_id,
            location: savedPhone.location,
            status: 'active',
            purchasedAt: savedPhone.purchased_at,
            pathwayId: savedPhone.pathway_id,
            subscriptionPlan: savedPhone.subscription_plan
          }
        })
    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("🚨 [ADD-PHONE-NUMBER] API error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}