
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { resolveAnalyticsDateRange } from '@/lib/analytics-date-range'
import { CallDatabaseService } from '@/services/call-database-service'

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [DATABASE-CALLS] Fetching calls from database...")

    // Verify authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || undefined
    const phoneNumber = searchParams.get('phoneNumber') || undefined
    const metaCapiStatus = searchParams.get('metaCapiStatus') as 'fired' | 'failed' | 'not_fired' | null
    const { start: rangeStart, end: rangeEnd } = resolveAnalyticsDateRange(searchParams)
    const isAllTime = !rangeStart && !rangeEnd

    // Verify the user ID matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    const now = new Date()
    const startDate = rangeStart?.toISOString()
    const endDate = isAllTime ? undefined : (rangeEnd ?? now).toISOString()

    console.log(`🔍 [DATABASE-CALLS] Fetching calls for user: ${user.id}`, {
      limit, offset, status, phoneNumber, startDate, endDate
    })

    // Get calls from database
    const result = await CallDatabaseService.getCallsForUser(userId, {
      limit,
      offset,
      status,
      phoneNumber,
      startDate,
      endDate,
      metaCapiStatus: metaCapiStatus || undefined,
    })

    console.log(`✅ [DATABASE-CALLS] Found ${result.calls.length} calls, total: ${result.total}`)

    return NextResponse.json({
      success: true,
      calls: result.calls,
      total: result.total,
      limit,
      offset
    })

  } catch (error: any) {
    console.error('🚨 [DATABASE-CALLS] Error:', error)
    console.error('🚨 [DATABASE-CALLS] Error stack:', error.stack)
    console.error('🚨 [DATABASE-CALLS] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    })
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error'
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      errorMessage = 'Database table "call_logs" does not exist. Please run the migration script.'
    } else if (error.message?.includes('permission denied')) {
      errorMessage = 'Database permission denied. Check user permissions.'
    } else if (error.message?.includes('connection')) {
      errorMessage = 'Database connection failed. Check DATABASE_URL configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error.message,
      code: error.code
    }, { status: 500 })
  }
}
