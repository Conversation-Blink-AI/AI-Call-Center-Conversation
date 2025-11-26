
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
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
    const timeframe = searchParams.get('timeframe') || '7d'

    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Calculate date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1)

    // Get basic stats
    const basicStats = await CallDatabaseService.getCallStats(userId)

    // Get enhanced stats with timeframe filtering
    const enhancedStats = await getEnhancedStats(userId, {
      today,
      yesterday,
      thisWeekStart,
      lastWeekStart,
      lastWeekEnd,
      thisMonthStart,
      lastMonthStart,
      lastMonthEnd
    })

    // Calculate derived metrics
    const averageDuration = basicStats.totalCalls > 0 
      ? Math.round(basicStats.totalDuration / basicStats.totalCalls)
      : 0

    const successRate = basicStats.totalCalls > 0 
      ? (basicStats.completedCalls / basicStats.totalCalls) * 100
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
        averageCostPerCall,
        callsThisWeek: enhancedStats.callsThisWeek,
        callsThisMonth: enhancedStats.callsThisMonth,
        costThisWeek: enhancedStats.costThisWeek,
        costThisMonth: enhancedStats.costThisMonth
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

  } catch (error) {
    console.error('Error fetching call stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call stats' },
      { status: 500 }
    )
  }
}

async function getEnhancedStats(userId: string, dates: any) {
  const { db } = await import('@/lib/db')

  // Get calls by timeframe
  const queries = await Promise.all([
    // Today
    db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
      FROM calls 
      WHERE user_id = $1 AND created_at >= $2
    `, [userId, dates.today.toISOString()]),

    // Yesterday
    db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
      FROM calls 
      WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
    `, [userId, dates.yesterday.toISOString(), dates.today.toISOString()]),

    // This week
    db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
      FROM calls 
      WHERE user_id = $1 AND created_at >= $2
    `, [userId, dates.thisWeekStart.toISOString()]),

    // Last week
    db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
      FROM calls 
      WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
    `, [userId, dates.lastWeekStart.toISOString(), dates.lastWeekEnd.toISOString()]),

    // This month
    db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
      FROM calls 
      WHERE user_id = $1 AND created_at >= $2
    `, [userId, dates.thisMonthStart.toISOString()]),

    // Last month
    db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
      FROM calls 
      WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
    `, [userId, dates.lastMonthStart.toISOString(), dates.lastMonthEnd.toISOString()])
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
