
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { CallDatabaseService } from '@/services/call-database-service'

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [AUTO-SYNC] Starting auto-sync process...")

    // Verify authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { calls, userId } = await request.json()

    // Verify the user ID matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    if (!calls || !Array.isArray(calls)) {
      return NextResponse.json({ error: 'Invalid calls data' }, { status: 400 })
    }

    console.log(`🔄 [AUTO-SYNC] Processing ${calls.length} calls for user: ${user.id}`)

    // Transform the calls to match the database format
    const blandApiCalls = calls.map(call => ({
      c_id: call.id,
      id: call.id,
      to: call.to_number,
      to_number: call.to_number,
      from: call.from_number,
      from_number: call.from_number,
      duration: call.duration,
      call_length: call.duration,
      status: call.status,
      recording_url: call.recording_url,
      transcription: call.transcript,
      summary: call.summary,
      pathway_id: call.pathway_id,
      ended_reason: call.ended_reason,
      start_time: call.start_time,
      end_time: call.end_time,
      variables: call.variables
    }))

    // Use the existing sync method from CallDatabaseService
    const syncCount = await CallDatabaseService.syncCallsForUser(userId, blandApiCalls)

    console.log(`✅ [AUTO-SYNC] Successfully synced ${syncCount} calls for user: ${user.id}`)

    return NextResponse.json({
      success: true,
      syncedCount: syncCount,
      message: `Successfully synced ${syncCount} calls`
    })

  } catch (error: any) {
    console.error('🚨 [AUTO-SYNC] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
