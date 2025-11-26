
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { CallBillingService } from '@/services/call-billing-service'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, userId, callId, durationSeconds } = await request.json()

    switch (action) {
      case 'process_pending':
        // Process all pending bills for user or all users (admin only)
        const targetUserId = userId && user.role === 'admin' ? userId : user.id
        const result = await CallBillingService.processPendingBills(targetUserId)
        
        return NextResponse.json({
          success: result.success,
          message: result.message,
          processedCalls: result.processedCalls,
          totalCostCents: result.totalCostCents
        })

      case 'bill_call':
        // Bill a specific call
        if (!callId || !durationSeconds) {
          return NextResponse.json(
            { error: 'Missing callId or durationSeconds' },
            { status: 400 }
          )
        }

        const billResult = await CallBillingService.billCall(
          callId,
          userId || user.id,
          durationSeconds
        )

        return NextResponse.json(billResult)

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('❌ [BILLING-API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

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
    const userId = searchParams.get('userId') || user.id

    // Only allow admins to view other users' billing stats
    if (userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const stats = await CallBillingService.getBillingStats(userId)

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error('❌ [BILLING-API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
