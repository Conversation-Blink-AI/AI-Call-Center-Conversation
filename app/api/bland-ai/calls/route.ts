import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [BLAND-CALLS] Starting call fetch...")
    console.log("🔍 [BLAND-CALLS] Request URL:", request.url)
    console.log("🔍 [BLAND-CALLS] Environment:", process.env.NODE_ENV)

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    // Authenticate user - use getUserFromRequest for proper cookie handling
    const user = await getUserFromRequest(request)
    if (!user) {
      console.log("🚨 [BLAND-CALLS] Authentication failed - no user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id
    console.log("✅ [BLAND-CALLS] User authenticated:", userId, user.email)

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

    // Fetch ALL calls from Bland.ai at once (without phone number filters)
    // This approach avoids IP blocking issues that occur when filtering by phone number
    // We'll filter the results server-side to match user's phone numbers
    let allUserCalls: any[] = []
    const apiErrors: any[] = []

    try {
      // Fetch all calls without phone number filters to avoid DigitalOcean IP blocking
      const blandUrl = `https://api.bland.ai/v1/calls?limit=1000&ascending=false&sort_by=created_at`
      
      console.log("🌐 [BLAND-CALLS] Fetching ALL calls from Bland.ai (will filter server-side)")
      console.log("🔍 [BLAND-CALLS] Bland API URL:", blandUrl)

      const response = await fetch(blandUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${blandApiKey}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500) // Limit error length
        }
        console.error(`❌ [BLAND-CALLS] Bland.ai API error:`, errorDetails)
        apiErrors.push(errorDetails)
      } else {
        const data = await response.json()
        console.log(`✅ [BLAND-CALLS] Received response from Bland.ai:`, {
          status: data.status,
          total_count: data.total_count,
          count: data.count,
          calls_length: data.calls?.length || 0
        })

        const allCalls = data.calls || []
        console.log(`📊 [BLAND-CALLS] Total calls received from Bland.ai:`, allCalls.length)

        // Filter calls to match user's phone numbers (both to and from)
        allUserCalls = allCalls.filter((call: any) => {
          const callToNumber = call.to || call.to_number || ''
          const callFromNumber = call.from || call.from_number || ''

          // Check if call involves any of user's phone numbers
          return userPhoneNumbers.some((userPhone) => {
            // Normalize phone numbers - remove all non-digits
            const normalizedUserPhone = userPhone.replace(/\D/g, "")
            const normalizedCallTo = callToNumber.replace(/\D/g, "")
            const normalizedCallFrom = callFromNumber.replace(/\D/g, "")

            // For US numbers, handle both with and without country code (1)
            const userWithoutCountryCode = normalizedUserPhone.startsWith("1") ? normalizedUserPhone.slice(1) : normalizedUserPhone
            const callToWithoutCountryCode = normalizedCallTo.startsWith("1") ? normalizedCallTo.slice(1) : normalizedCallTo
            const callFromWithoutCountryCode = normalizedCallFrom.startsWith("1") ? normalizedCallFrom.slice(1) : normalizedCallFrom

            return (
              // Exact match with full numbers
              normalizedCallTo === normalizedUserPhone || 
              normalizedCallFrom === normalizedUserPhone ||
              // Match without country codes  
              callToWithoutCountryCode === userWithoutCountryCode ||
              callFromWithoutCountryCode === userWithoutCountryCode ||
              // Match if numbers contain each other (for different formatting)
              normalizedCallTo.includes(userWithoutCountryCode) || 
              normalizedCallFrom.includes(userWithoutCountryCode) ||
              normalizedUserPhone.includes(callToWithoutCountryCode) ||
              normalizedUserPhone.includes(callFromWithoutCountryCode)
            )
          })
        })

        console.log(`🎯 [BLAND-CALLS] Filtered ${allUserCalls.length} user-specific calls from ${allCalls.length} total calls`)
      }
    } catch (fetchError: any) {
      const errorDetails = {
        error: fetchError.message,
        type: fetchError.name
      }
      console.error(`❌ [BLAND-CALLS] Fetch error:`, errorDetails)
      apiErrors.push(errorDetails)
    }

    if (apiErrors.length > 0) {
      console.warn(`⚠️ [BLAND-CALLS] ${apiErrors.length} API errors occurred:`, apiErrors)
    }

    console.log("📊 [BLAND-CALLS] Total calls found for user:", allUserCalls.length)

    // Get server IP for debugging
    let serverIP: string | null = null
    try {
      const ipResponse = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(3000)
      })
      const ipData = await ipResponse.json()
      serverIP = ipData.ip
      console.log("🌐 [BLAND-CALLS] Server public IP:", serverIP)
    } catch (error) {
      console.warn("⚠️ [BLAND-CALLS] Could not fetch server IP:", error)
    }

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
        phone_numbers_checked: userPhoneNumbers.length,
        api_errors: apiErrors.length > 0 ? apiErrors : undefined,
        environment: process.env.NODE_ENV,
        has_bland_api_key: !!blandApiKey,
        user_id: userId,
        server_public_ip: serverIP || undefined
      }
    })

  } catch (error: any) {
    console.error("🚨 [BLAND-CALLS] Unexpected error:", error)
    console.error("🚨 [BLAND-CALLS] Error stack:", error?.stack)
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
      debug_info: {
        error_type: error?.name,
        error_message: error?.message,
        environment: process.env.NODE_ENV
      }
    }, { status: 500 })
  }
}