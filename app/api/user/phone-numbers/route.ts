import { NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { encryptString, hashPhoneNumber, phoneLast4 } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"

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
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
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
          pn.pathwayid,
          p.id as pathway_id_from_phone,
          p.name as pathway_name,
          p.description as pathway_description
         FROM phone_numbers pn
         LEFT JOIN pathways p ON p.phone_id = pn.id
         WHERE pn.user_id = $1
         ORDER BY pn.purchased_at DESC`,
        [userId]
      )

      console.log("🔍 [USER-PHONE-NUMBERS] Query result rows:", result.rows.length)
      if (result.rows.length > 0) {
        console.log("📊 [USER-PHONE-NUMBERS] Sample row:", JSON.stringify(result.rows[0], null, 2))
      }

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
        pathway_id: row.pathway_id_from_phone || row.pathwayid || null,
        pathway_name: row.pathway_name || null,
        pathway_description: row.pathway_description || null
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
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()
      const normalizedPhone = toE164Format(phoneNumber)
      const phoneEnc = encryptString(normalizedPhone)
      const phoneHash = hashPhoneNumber(normalizedPhone)
      const phoneLast = phoneLast4(normalizedPhone)
      const result = await client.query(
        `INSERT INTO phone_numbers (
          phone_number,
          phone_number_enc,
          phone_number_hash,
          phone_number_last4,
          user_id,
          location,
          type,
          assigned_to,
          purchased_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (phone_number) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           location = EXCLUDED.location,
           type = EXCLUDED.type,
           assigned_to = EXCLUDED.assigned_to,
           phone_number_enc = EXCLUDED.phone_number_enc,
           phone_number_hash = EXCLUDED.phone_number_hash,
           phone_number_last4 = EXCLUDED.phone_number_last4
         RETURNING *`,
        [
          normalizedPhone,
          phoneEnc,
          phoneHash,
          phoneLast,
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
            pathwayId: savedPhone.pathwayid,
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