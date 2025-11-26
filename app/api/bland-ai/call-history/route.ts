
import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { CallDatabaseService } from "@/services/call-database-service"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || undefined
    const phoneNumber = searchParams.get('phone_number') || undefined
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined
    const sync = searchParams.get('sync') === 'true'

    // If sync is requested, fetch latest data from Bland.ai first
    if (sync) {
      try {
        // Trigger sync from Bland.ai
        const syncResponse = await fetch(`${request.headers.get('origin')}/api/calls/sync`, {
          method: 'GET',
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          }
        })

        if (!syncResponse.ok) {
          console.warn('Failed to sync calls from Bland.ai, proceeding with cached data')
        }
      } catch (error) {
        console.warn('Sync request failed, proceeding with cached data:', error)
      }
    }

    // Get calls from database
    const { calls, total } = await CallDatabaseService.getCallsForUser(user.value.id, {
      limit,
      offset,
      status,
      phoneNumber,
      startDate,
      endDate
    })

    // Get user's primary phone number for display
    const { db } = await import("@/lib/db")
    const phoneResult = await db.query(`
      SELECT phone_number FROM phone_numbers 
      WHERE user_id = $1 
      ORDER BY purchased_at DESC 
      LIMIT 1
    `, [user.value.id])

    const userPhoneNumber = phoneResult.rows[0]?.phone_number || null

    // Get call statistics
    const stats = await CallDatabaseService.getCallStats(user.value.id)

    return NextResponse.json({ 
      success: true, 
      calls,
      totalCalls: total,
      userPhoneNumber,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: offset + calls.length < total
      }
    })
    
  } catch (error) {
    console.error("Error fetching call history:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
