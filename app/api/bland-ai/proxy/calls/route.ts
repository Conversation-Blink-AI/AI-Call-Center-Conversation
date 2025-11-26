
import { type NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 60 * 1000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = requestCounts.get(userId)

  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(userId, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (userRequests.count >= RATE_LIMIT) {
    return false
  }

  userRequests.count++
  return true
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [BLAND-PROXY] Starting user-specific call fetch...")

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    // Authenticate user
    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      console.log("🚨 [BLAND-PROXY] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = authResult.user
    const userId = user.id
    console.log("✅ [BLAND-PROXY] User authenticated:", userId)

    // Check rate limit
    if (!checkRateLimit(userId)) {
      console.warn("🚨 [BLAND-PROXY] Rate limit exceeded for user:", userId)
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    // Get user's phone numbers from PostgreSQL
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    let phoneNumbers: string[] = []
    let pathwayIds: string[] = []

    try {
      await client.connect()
      
      // Set user context for RLS
      await client.query(`SET app.current_user_id = '${userId}'`)

      const result = await client.query(
        `SELECT phone_number, pathway_id FROM phone_numbers WHERE user_id = $1`,
        [userId]
      )

      phoneNumbers = result.rows.map(row => row.phone_number.trim())
      pathwayIds = result.rows
        .filter(row => row.pathway_id)
        .map(row => row.pathway_id)

      console.log("📞 [BLAND-PROXY] User phone numbers:", phoneNumbers)
      console.log("🛤️ [BLAND-PROXY] User pathway IDs:", pathwayIds)
    } finally {
      await client.end()
    }

    if (phoneNumbers.length === 0) {
      console.log("📞 [BLAND-PROXY] No phone numbers found for user")
      return NextResponse.json({
        calls: [],
        count: 0,
        total: 0,
        has_more: false,
        page,
        limit,
        debug_info: {
          user_id: userId,
          user_phone_numbers: [],
          user_pathways: 0,
          total_bland_calls: 0,
          filtered_user_calls: 0,
        },
      })
    }

    // Get Bland.ai API key
    const blandApiKey = process.env.BLAND_AI_API_KEY
    if (!blandApiKey) {
      console.error("🚨 [BLAND-PROXY] Bland.ai API key not configured")
      return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 500 })
    }

    // Get ALL calls from Bland.ai and filter them ourselves for better matching
    const url = `https://api.bland.ai/v1/calls?limit=1000&ascending=false&sort_by=created_at`
    
    console.log("🌐 [BLAND-PROXY] Calling Bland.ai API:", url)

    // Updated fetch options format as requested
    const options = {
      method: 'GET',
      headers: {
        authorization: blandApiKey
      },
      body: undefined
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ [BLAND-PROXY] Bland.ai API error:", response.status, errorText)
      return NextResponse.json({ error: `Bland.ai API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log("📊 [BLAND-PROXY] Raw Bland.ai response:", {
      totalCalls: data.calls?.length || 0,
      hasMore: data.has_more,
    })

    // Filter calls to match user's phone numbers or pathways
    const allCalls = data.calls || []
    
    console.log("📊 [BLAND-PROXY] All calls from Bland.ai API:", {
      totalCalls: allCalls.length,
      sampleCall: allCalls[0] ? {
        id: allCalls[0].call_id || allCalls[0].id,
        to: allCalls[0].to || allCalls[0].to_number,
        from: allCalls[0].from || allCalls[0].from_number,
        created_at: allCalls[0].created_at
      } : null
    })

    const userCalls = allCalls.filter((call: any) => {
      const callToNumber = call.to || call.to_number
      const callFromNumber = call.from || call.from_number
      const callPathwayId = call.pathway_id

      // Check if call belongs to user's pathway
      const matchesPathway = callPathwayId && pathwayIds.includes(callPathwayId)

      // Check if call involves any of user's phone numbers (to or from)
      const matchesPhoneNumber = phoneNumbers.some((userPhone) => {
        // Normalize phone numbers - remove all non-digits
        const normalizedUserPhone = userPhone.replace(/\D/g, "")
        const normalizedCallTo = (callToNumber || "").replace(/\D/g, "")
        const normalizedCallFrom = (callFromNumber || "").replace(/\D/g, "")

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

      const result = matchesPhoneNumber || matchesPathway
      
      // Debug first few calls
      if (allCalls.indexOf(call) < 3) {
        console.log("🔍 [BLAND-PROXY] Call matching debug:", {
          callIndex: allCalls.indexOf(call),
          callTo: callToNumber,
          callFrom: callFromNumber,
          userPhones: phoneNumbers,
          matchesPhone: matchesPhoneNumber,
          matchesPathway: matchesPathway,
          result: result
        })
      }

      return result
    })

    console.log("🎯 [BLAND-PROXY] Filtered calls for user:", {
      totalBlandCalls: data.calls?.length || 0,
      userSpecificCalls: userCalls.length,
      userPhoneNumbers: phoneNumbers,
      userPathways: pathwayIds.length,
    })

    // Apply pagination to filtered results
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedCalls = userCalls.slice(startIndex, endIndex)

    // Transform calls to our format
    const transformedCalls = paginatedCalls.map((call: any) => ({
      call_id: call.call_id || call.id,
      to: call.to || call.to_number,
      from: call.from || call.from_number,
      call_length: call.call_length || call.duration || 0,
      created_at: call.created_at || call.start_time,
      queue_status: call.status || call.queue_status || "unknown",
      call_successful: call.completed || call.call_successful || false,
      ended_reason: call.ended_reason || "unknown",
      recording_url: call.recording_url,
      transcript: call.transcript,
      summary: call.summary,
      pathway_id: call.pathway_id,
      corrected_duration: call.corrected_duration,
      variables: call.variables || {},
    }))

    return NextResponse.json({
      calls: transformedCalls,
      count: transformedCalls.length,
      total: userCalls.length,
      has_more: endIndex < userCalls.length,
      page,
      limit,
      debug_info: {
        user_id: userId,
        user_phone_numbers: phoneNumbers,
        user_pathways: pathwayIds.length,
        total_bland_calls: data.calls?.length || 0,
        filtered_user_calls: userCalls.length,
        api_url_used: url,
      },
    })
  } catch (error: any) {
    console.error("🚨 [BLAND-PROXY] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
