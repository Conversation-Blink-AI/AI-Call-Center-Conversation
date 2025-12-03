import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

/**
 * Diagnostic endpoint to test call history fetching
 * This will help identify why calls aren't showing up
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's phone numbers
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    let userPhoneNumbers: string[] = []

    try {
      await client.connect()
      await client.query(`SET app.current_user_id = '${user.id}'`)

      const result = await client.query(
        `SELECT phone_number FROM phone_numbers WHERE user_id = $1`,
        [user.id]
      )

      userPhoneNumbers = result.rows.map(row => row.phone_number.trim())
    } finally {
      await client.end()
    }

    // Test Bland.ai API call
    const blandApiKey = process.env.BLAND_AI_API_KEY
    if (!blandApiKey) {
      return NextResponse.json({
        error: "BLAND_AI_API_KEY not configured"
      }, { status: 500 })
    }

    // Fetch calls from Bland.ai
    const blandUrl = `https://api.bland.ai/v1/calls?limit=10&ascending=false&sort_by=created_at`
    
    const response = await fetch(blandUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${blandApiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: "Bland.ai API error",
        status: response.status,
        error_details: errorText.substring(0, 500)
      })
    }

    const data = await response.json()
    const allCalls = data.calls || []

    // Analyze calls
    const analysis = {
      total_calls_from_bland: allCalls.length,
      user_phone_numbers: userPhoneNumbers,
      sample_calls: allCalls.slice(0, 5).map((call: any) => ({
        call_id: call.call_id || call.id,
        to: call.to || call.to_number,
        from: call.from || call.from_number,
        created_at: call.created_at
      })),
      phone_number_matching: userPhoneNumbers.map(userPhone => {
        const normalizedUserPhone = userPhone.replace(/\D/g, "")
        const userWithoutCountryCode = normalizedUserPhone.startsWith("1") ? normalizedUserPhone.slice(1) : normalizedUserPhone
        
        const matchingCalls = allCalls.filter((call: any) => {
          const callTo = (call.to || call.to_number || '').replace(/\D/g, "")
          const callFrom = (call.from || call.from_number || '').replace(/\D/g, "")
          
          const callToWithoutCC = callTo.startsWith("1") ? callTo.slice(1) : callTo
          const callFromWithoutCC = callFrom.startsWith("1") ? callFrom.slice(1) : callFrom
          
          return (
            callTo === normalizedUserPhone ||
            callFrom === normalizedUserPhone ||
            callToWithoutCC === userWithoutCountryCode ||
            callFromWithoutCC === userWithoutCountryCode ||
            callTo.endsWith(userWithoutCountryCode) ||
            callFrom.endsWith(userWithoutCountryCode)
          )
        })

        return {
          phone_number: userPhone,
          normalized: normalizedUserPhone,
          without_country_code: userWithoutCountryCode,
          matching_calls_count: matchingCalls.length,
          sample_matching_calls: matchingCalls.slice(0, 3).map((call: any) => ({
            to: call.to || call.to_number,
            from: call.from || call.from_number,
            call_id: call.call_id || call.id
          }))
        }
      })
    }

    return NextResponse.json({
      success: true,
      ...analysis,
      recommendation: allCalls.length === 0
        ? "Bland.ai returned 0 calls. This could mean: 1) No calls exist for this API key, 2) API key doesn't have access, or 3) Calls haven't been made yet."
        : analysis.phone_number_matching.every(p => p.matching_calls_count === 0)
        ? "Bland.ai returned calls but none match your phone numbers. Check the sample calls to see what phone numbers are in the calls."
        : "Some calls matched your phone numbers. Check the matching_calls_count for each phone number."
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 })
  }
}

