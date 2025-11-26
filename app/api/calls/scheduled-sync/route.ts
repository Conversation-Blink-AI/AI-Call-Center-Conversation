
import { NextResponse } from 'next/server'
import CallSyncService from '@/services/call-sync-service'
import { executeQuery } from '@/lib/db-utils'

export const dynamic = 'force-dynamic'

/**
 * Scheduled Sync Endpoint
 * This endpoint should be called by a cron job/scheduled task every 1 minute
 * It syncs calls for all users and automatically bills them
 */
export async function GET() {
  try {
    console.log('🔄 [SCHEDULED-SYNC] Starting scheduled sync at:', new Date().toISOString())

    // Get all active users with phone numbers
    const users = await executeQuery(`
      SELECT DISTINCT u.id, u.email
      FROM users u
      JOIN phone_numbers pn ON u.id = pn.user_id
      WHERE u.email_verified = true
      ORDER BY u.id
    `)

    console.log(`🔄 [SCHEDULED-SYNC] Found ${users.length} users to sync`)

    const callSyncService = new CallSyncService()
    const results = {
      totalUsers: users.length,
      totalCallsSynced: 0,
      successfulUsers: 0,
      failedUsers: 0,
      errors: [] as string[]
    }

    // Sync calls for each user
    for (const user of users) {
      try {
        console.log(`🔄 [SCHEDULED-SYNC] Syncing calls for user: ${user.email}`)
        
        const syncResult = await callSyncService.syncCallsForUser(user.id, 50)
        
        results.totalCallsSynced += syncResult.synced
        results.successfulUsers++
        
        if (syncResult.synced > 0) {
          console.log(`✅ [SCHEDULED-SYNC] Synced ${syncResult.synced} calls for ${user.email}`)
        }
        
        if (syncResult.errors.length > 0) {
          results.errors.push(`${user.email}: ${syncResult.errors.join(', ')}`)
        }
      } catch (error) {
        results.failedUsers++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`${user.email}: ${errorMsg}`)
        console.error(`❌ [SCHEDULED-SYNC] Failed to sync for ${user.email}:`, error)
      }
    }

    console.log('✅ [SCHEDULED-SYNC] Completed scheduled sync:', {
      timestamp: new Date().toISOString(),
      totalUsers: results.totalUsers,
      totalCallsSynced: results.totalCallsSynced,
      successfulUsers: results.successfulUsers,
      failedUsers: results.failedUsers
    })

    return NextResponse.json({
      success: true,
      message: `Scheduled sync completed successfully`,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('❌ [SCHEDULED-SYNC] Critical error:', error)
    return NextResponse.json({
      success: false,
      message: 'Scheduled sync failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST method for manual trigger (optional)
export async function POST() {
  return GET()
}
