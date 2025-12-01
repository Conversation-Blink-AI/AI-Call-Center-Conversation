import { NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [BLAND-CALLS] Starting call fetch...")

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    // Authenticate user
    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      console.log("🚨 [BLAND-CALLS] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = authResult.user
    const userId = user.id
    console.log("✅ [BLAND-CALLS] User authenticated:", userId)

    // Get user's phone numbers from PostgreSQL
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    let userPhoneNumbers: string[] = []

    try {
      await client.connect()

      // Set user context for RLS
      await client.query(`SET app.current_user_id = '${userId}'`)

      const result = await client.query(
        `SELECT phone_number FROM phone_numbers WHERE user_id = $1`,
        [userId]
      )

      userPhoneNumbers = result.rows.map(row => row.phone_number.trim())
      console.log("📞 [BLAND-CALLS] User phone numbers:", userPhoneNumbers)
    } finally {
      await client.end()
    }

    if (userPhoneNumbers.length === 0) {
      console.log("📞 [BLAND-CALLS] No phone numbers found for user")
      return NextResponse.json({
        count: 0,
        calls: [],
        total: 0,
        has_more: false,
        page,
        limit,
        message: "No phone numbers found for user"
      })
    }

    // Get Bland.ai API key
    const blandApiKey = process.env.BLAND_AI_API_KEY
    if (!blandApiKey) {
      console.error("🚨 [BLAND-CALLS] Bland.ai API key not configured")
      return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 500 })
    }

    // Fetch calls for each user phone number using Bland.ai's filters
    let allUserCalls: any[] = []

    for (const phoneNumber of userPhoneNumbers) {
      console.log("🌐 [BLAND-CALLS] Fetching calls for phone number:", phoneNumber)
      
      // Properly encode the phone number
      const encodedNumber = encodeURIComponent(phoneNumber)
      console.log("🔧 [BLAND-CALLS] Encoded phone number:", encodedNumber)

      // Try both to_number and from_number directions
      for (const direction of ["to_number", "from_number"]) {
        const blandUrl = new URL('https://api.bland.ai/v1/calls')
        blandUrl.searchParams.set('limit', '1000')
        blandUrl.searchParams.set('ascending', 'false')
        blandUrl.searchParams.set('sort_by', 'created_at')
        blandUrl.searchParams.set(direction, encodedNumber)

        console.log(`📞 [BLAND-CALLS] Querying with ${direction}=${encodedNumber}`)
        console.log("🔍 [BLAND-CALLS] Final Bland API URL:", blandUrl.toString())

        const response = await fetch(blandUrl.toString(), {
          method: 'GET',
          headers: {
            'authorization': blandApiKey,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          console.error(`❌ [BLAND-CALLS] Bland.ai API error for ${phoneNumber} (${direction}):`, response.status)
          const errorText = await response.text()
          console.error("❌ [BLAND-CALLS] Error details:", errorText)
          continue // Continue with other directions/phone numbers
        }

        const data = await response.json()
        console.log(`✅ [BLAND-CALLS] Received response for ${phoneNumber} (${direction}):`, {
          status: data.status,
          total_count: data.total_count,
          count: data.count,
          calls_length: data.calls?.length || 0
        })

        if (data.calls && Array.isArray(data.calls) && data.calls.length > 0) {
          // Avoid duplicates by checking if call_id already exists
          const newCalls = data.calls.filter(call => 
            !allUserCalls.some(existingCall => 
              (existingCall.call_id || existingCall.c_id || existingCall.id) === 
              (call.call_id || call.c_id || call.id)
            )
          )
          
          allUserCalls = allUserCalls.concat(newCalls)
          console.log(`📊 [BLAND-CALLS] Added ${newCalls.length} new calls for ${phoneNumber} (${direction})`)
        }
      }
    }

    console.log("📊 [BLAND-CALLS] Total calls found for user:", allUserCalls.length)

    // Sort calls by created_at (newest first)
    allUserCalls.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedCalls = allUserCalls.slice(startIndex, endIndex)

    // Transform calls to consistent format
    const transformedCalls = paginatedCalls.map((call: any) => ({
      call_id: call.call_id || call.c_id || call.id,
      to: call.to || call.to_number,
      from: call.from || call.from_number,
      call_length: call.call_length || call.duration || 0,
      created_at: call.created_at || call.start_time,
      updated_at: call.updated_at,
      queue_status: call.status || call.queue_status || "unknown",
      call_successful: call.completed || call.call_successful || false,
      ended_reason: call.ended_reason || "unknown",
      recording_url: call.recording_url,
      transcript: call.transcript,
      summary: call.summary,
      pathway_id: call.pathway_id,
      corrected_duration: call.corrected_duration,
      variables: call.variables || {},
      inbound: call.inbound,
      max_duration: call.max_duration,
      metadata: call.metadata,
      endpoint_url: call.endpoint_url,
      phone_number: call.phone_number,
      country: call.country,
      state: call.state,
      record: call.record,
      placement_group: call.placement_group,
      region: call.region,
      language: call.language,
      user_id: call.user_id,
      timestamp: call.timestamp,
      timezone: call.timezone,
      callID: call.callID,
      Yes: call.Yes,
      start_time: call.start_time,
      completed: call.completed
    }))

    return NextResponse.json({
      status: "success",
      total_count: allUserCalls.length,
      count: transformedCalls.length,
      calls: transformedCalls,
      has_more: endIndex < allUserCalls.length,
      page,
      limit,
      user_phone_numbers: userPhoneNumbers,
      debug_info: {
        total_user_calls: allUserCalls.length,
        phone_numbers_checked: userPhoneNumbers.length
      }
    })

  } catch (error: any) {
    console.error("🚨 [BLAND-CALLS] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}