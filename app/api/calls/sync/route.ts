import { NextResponse } from "next/server"
import CallSyncService from "@/services/call-sync-service"

export async function POST(request: Request) {
  try {
    const { userId, callId, syncAll } = await request.json()

    const callSyncService = new CallSyncService()

    if (syncAll) {
      // Sync all calls for all users
      const result = await callSyncService.syncAllCalls()

      return NextResponse.json({
        success: true,
        message: `Synced ${result.totalSynced} calls total`,
        data: result
      })
    }

    if (callId) {
      // Sync a specific call
      if (!userId) {
        return NextResponse.json({
          success: false,
          message: "User ID is required for specific call sync"
        }, { status: 400 })
      }

      const call = await callSyncService.fetchCallById(callId)
      if (!call) {
        return NextResponse.json({
          success: false,
          message: "Call not found"
        }, { status: 404 })
      }

      const result = await callSyncService.syncCallToDatabase(call, userId)

      return NextResponse.json({
        success: true,
        message: "Call synced successfully",
        data: result
      })
    }

    if (userId) {
      // Sync calls for specific user with enhanced billing
      const result = await callSyncService.syncCallsForUser(userId)

      // Additional message for billing
      const billingInfo = result.synced > 0 ? 
        ` (${result.synced} calls synced and automatically billed)` : 
        ''

      return NextResponse.json({
        success: true,
        message: `Synced ${result.synced} calls for user${billingInfo}`,
        data: result,
        syncedCount: result.synced
      })
    }

    return NextResponse.json({
      success: false,
      message: "Please provide userId, callId, or set syncAll to true"
    }, { status: 400 })

  } catch (error) {
    console.error("Error syncing calls:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to sync calls",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const callSyncService = new CallSyncService()

    // Get recent calls from database
    const recentCalls = await require('@/lib/db-utils').executeQuery(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
        MAX(created_at) as last_sync
      FROM calls
    `)

    return NextResponse.json({
      success: true,
      data: {
        stats: recentCalls[0],
        message: "Call sync service is ready"
      }
    })
  } catch (error) {
    console.error("Error checking sync status:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to check sync status",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}