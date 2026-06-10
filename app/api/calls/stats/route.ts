
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { resolveAnalyticsDateRange } from '@/lib/analytics-date-range'
import { CallDatabaseService } from '@/services/call-database-service'

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

    // Calculate date ranges for comparison metrics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1)

    // Get basic stats (scoped to selected date range)
    const basicStats = await CallDatabaseService.getCallStatsForRange(userId, {
      startDate: rangeStart ? rangeStart.toISOString() : undefined,
      endDate: isAllTime ? undefined : (rangeEnd ?? now).toISOString()
    })

    // Get enhanced stats with date range filtering
    const enhancedStats = await getEnhancedStats(userId, {
      today,
      yesterday,
      thisWeekStart,
      lastWeekStart,
      lastWeekEnd,
      thisMonthStart,
      lastMonthStart,
      lastMonthEnd,
      rangeStart,
      rangeEnd: isAllTime ? null : (rangeEnd ?? now)
    })

    const volumeSeries = await getCallVolumeSeries(userId, {
      rangeStart,
      rangeEnd: isAllTime ? null : (rangeEnd ?? now)
    })

    const qualifiedLeadsSeries = await getQualifiedLeadsSeries(userId, {
      rangeStart,
      rangeEnd: isAllTime ? null : (rangeEnd ?? now)
    })

    // Calculate derived metrics
    const averageDuration = basicStats.totalCalls > 0 
      ? Math.round(basicStats.totalDuration / basicStats.totalCalls)
      : 0

    const successRate = basicStats.totalCalls > 0 
      ? (basicStats.completedCalls / basicStats.totalCalls) * 100
      : 0

    const qualifiedLeadsRate = basicStats.totalCalls > 0
      ? (basicStats.transferredCalls / basicStats.totalCalls) * 100
      : 0

    const averageCostPerCall = basicStats.totalCalls > 0 
      ? Math.round(basicStats.totalCost / basicStats.totalCalls)
      : 0

    const response = {
      success: true,
      stats: {
        ...basicStats,
        averageDuration,
        successRate,
        qualifiedLeadsRate,
        averageCostPerCall,
        callsThisWeek: enhancedStats.callsThisWeek,
        callsThisMonth: enhancedStats.callsThisMonth,
        costThisWeek: enhancedStats.costThisWeek,
        costThisMonth: enhancedStats.costThisMonth,
        volumeSeries,
        qualifiedLeadsSeries
      },
      timeframeCounts: {
        today: enhancedStats.callsToday,
        yesterday: enhancedStats.callsYesterday,
        thisWeek: enhancedStats.callsThisWeek,
        lastWeek: enhancedStats.callsLastWeek,
        thisMonth: enhancedStats.callsThisMonth,
        lastMonth: enhancedStats.callsLastMonth
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('🚨 [CALLS-STATS] Error:', error)
    console.error('🚨 [CALLS-STATS] Error stack:', error.stack)
    console.error('🚨 [CALLS-STATS] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    })
    
    // Provide more specific error messages
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

async function getEnhancedStats(userId: string, dates: any) {
  const { db } = await import('@/lib/db')

  const rangeStart = dates.rangeStart ? new Date(dates.rangeStart).toISOString() : null
  const rangeEnd = dates.rangeEnd ? new Date(dates.rangeEnd).toISOString() : null

  // Get calls by timeframe
  // Note: cost_cents column doesn't exist in call_logs table, so cost is set to 0
  const queries = await Promise.all([
    // Today
    db.query(`
      SELECT COUNT(*) as count, 0 as cost 
      FROM call_logs 
      WHERE user_id = $1 
        AND created_at >= $2
        AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR created_at <= $4::timestamptz)
    `, [userId, dates.today.toISOString(), rangeStart, rangeEnd]),

    // Yesterday
    db.query(`
      SELECT COUNT(*) as count, 0 as cost 
      FROM call_logs 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at < $3
        AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
        AND ($5::timestamptz IS NULL OR created_at <= $5::timestamptz)
    `, [userId, dates.yesterday.toISOString(), dates.today.toISOString(), rangeStart, rangeEnd]),

    // This week
    db.query(`
      SELECT COUNT(*) as count, 0 as cost 
      FROM call_logs 
      WHERE user_id = $1 
        AND created_at >= $2
        AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR created_at <= $4::timestamptz)
    `, [userId, dates.thisWeekStart.toISOString(), rangeStart, rangeEnd]),

    // Last week
    db.query(`
      SELECT COUNT(*) as count, 0 as cost 
      FROM call_logs 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
        AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
        AND ($5::timestamptz IS NULL OR created_at <= $5::timestamptz)
    `, [userId, dates.lastWeekStart.toISOString(), dates.lastWeekEnd.toISOString(), rangeStart, rangeEnd]),

    // This month
    db.query(`
      SELECT COUNT(*) as count, 0 as cost 
      FROM call_logs 
      WHERE user_id = $1 
        AND created_at >= $2
        AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR created_at <= $4::timestamptz)
    `, [userId, dates.thisMonthStart.toISOString(), rangeStart, rangeEnd]),

    // Last month
    db.query(`
      SELECT COUNT(*) as count, 0 as cost 
      FROM call_logs 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
        AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
        AND ($5::timestamptz IS NULL OR created_at <= $5::timestamptz)
    `, [userId, dates.lastMonthStart.toISOString(), dates.lastMonthEnd.toISOString(), rangeStart, rangeEnd])
  ])

  return {
    callsToday: parseInt(queries[0].rows[0].count),
    costToday: parseInt(queries[0].rows[0].cost),
    callsYesterday: parseInt(queries[1].rows[0].count),
    costYesterday: parseInt(queries[1].rows[0].cost),
    callsThisWeek: parseInt(queries[2].rows[0].count),
    costThisWeek: parseInt(queries[2].rows[0].cost),
    callsLastWeek: parseInt(queries[3].rows[0].count),
    costLastWeek: parseInt(queries[3].rows[0].cost),
    callsThisMonth: parseInt(queries[4].rows[0].count),
    costThisMonth: parseInt(queries[4].rows[0].cost),
    callsLastMonth: parseInt(queries[5].rows[0].count),
    costLastMonth: parseInt(queries[5].rows[0].cost)
  }
}

async function getCallVolumeSeries(
  userId: string,
  dates: { rangeStart: Date | null; rangeEnd: Date | null }
) {
  const { db } = await import('@/lib/db')

  const rangeStart = dates.rangeStart ? dates.rangeStart.toISOString() : null
  const rangeEnd = dates.rangeEnd ? dates.rangeEnd.toISOString() : null

  const result = await db.query(
    `
      SELECT 
        DATE_TRUNC('day', created_at) AS day,
        COUNT(*) AS count
      FROM call_logs
      WHERE user_id = $1
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
      GROUP BY day
      ORDER BY day ASC
    `,
    [userId, rangeStart, rangeEnd]
  )

  return result.rows.map((row: any) => ({
    date: row.day,
    count: parseInt(row.count)
  }))
}

async function getQualifiedLeadsSeries(
  userId: string,
  dates: { rangeStart: Date | null; rangeEnd: Date | null }
) {
  const { db } = await import('@/lib/db')

  const rangeStart = dates.rangeStart ? dates.rangeStart.toISOString() : null
  const rangeEnd = dates.rangeEnd ? dates.rangeEnd.toISOString() : null

  const result = await db.query(
    `
      SELECT 
        DATE_TRUNC('day', created_at) AS day,
        COUNT(*) AS count
      FROM call_logs
      WHERE user_id = $1
        AND (
          (transferred_to IS NOT NULL AND TRIM(transferred_to) != '')
          OR ended_reason ILIKE '%transfer%' 
          OR ended_reason ILIKE '%transferred%'
          OR ended_reason ILIKE '%transfered%'
        )
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
      GROUP BY day
      ORDER BY day ASC
    `,
    [userId, rangeStart, rangeEnd]
  )

  return result.rows.map((row: any) => ({
    date: row.day,
    count: parseInt(row.count)
  }))
}
