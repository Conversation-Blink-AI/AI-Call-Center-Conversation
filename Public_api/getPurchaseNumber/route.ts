
import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({
        success: false,
        message: "Email parameter is required"
      }, { status: 400 })
    }

    console.log(`[GET-PURCHASE-NUMBER] Looking up phone numbers for email: ${email}`)

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()

      // First, find the user by email
      const userResult = await client.query(
        'SELECT id, email, name FROM users WHERE email = $1',
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
        })
      }

      const user = userResult.rows[0]
      console.log(`[GET-PURCHASE-NUMBER] User found: ${user.id}`)

      // Get all phone numbers for this user
      const phoneResult = await client.query(
        `SELECT 
          pn.id,
          pn.phone_number as number,
          pn.location,
          pn.purchased_at,
          pn.user_id,
          pn.subscription_plan,
          pn.pathway_id
         FROM phone_numbers pn
         WHERE pn.user_id = $1
         ORDER BY pn.purchased_at DESC`,
        [user.id]
      )

      const phoneNumbers = phoneResult.rows.map(row => ({
        id: row.id,
        number: row.number ? row.number.trim() : '',
        status: 'active',
        location: row.location || 'Unknown',
        type: 'Local',
        purchased_at: row.purchased_at,
        user_id: row.user_id,
        monthly_fee: parseFloat(row.subscription_plan) || 1.50,
        pathway_id: row.pathway_id,
        pathway_name: row.pathway_id ? `Pathway ${row.pathway_id}` : null
      }))

      console.log(`[GET-PURCHASE-NUMBER] Found ${phoneNumbers.length} phone numbers for user ${user.id}`)

      return NextResponse.json({
        success: true,
        email: email,
        user_name: user.name,
        phoneNumbers: phoneNumbers,
        count: phoneNumbers.length
      })

    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[GET-PURCHASE-NUMBER] Error:", error)
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 })
  }
}
