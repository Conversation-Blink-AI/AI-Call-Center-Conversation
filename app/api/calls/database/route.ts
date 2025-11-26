
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
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
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // Verify the user ID matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

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
      endDate
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
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
