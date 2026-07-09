
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { resolveAnalyticsDateRange } from '@/lib/analytics-date-range'
import { getCallAnalyticsForUserIds } from '@/lib/org-analytics'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const { start: rangeStart, end: rangeEnd } = resolveAnalyticsDateRange(searchParams)
    const isAllTime = !rangeStart && !rangeEnd
    const now = new Date()

    const { stats, timeframeCounts } = await getCallAnalyticsForUserIds([userId], {
      rangeStart,
      rangeEnd: isAllTime ? null : (rangeEnd ?? now),
    })

    return NextResponse.json({
      success: true,
      stats,
      timeframeCounts,
    })

  } catch (error: any) {
    console.error('🚨 [CALLS-STATS] Error:', error)
    
    let errorMessage = 'Failed to fetch call stats'
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      errorMessage = 'Database table "call_logs" does not exist. Please run the migration script.'
    } else if (error.message?.includes('permission denied')) {
      errorMessage = 'Database permission denied. Check user permissions.'
    } else if (error.message?.includes('connection')) {
      errorMessage = 'Database connection failed. Check DATABASE_URL configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        code: error.code
      },
      { status: 500 }
    )
  }
}
