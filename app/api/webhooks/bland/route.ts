import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Bland AI Webhook (DISABLED FOR BILLING)
 * 
 * This webhook is now DISABLED for billing purposes.
 * All billing is handled by the scheduled sync endpoint at /api/calls/scheduled-sync
 * 
 * This endpoint now only logs webhook events for debugging purposes.
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔔 [BLAND-WEBHOOK] ==================== BLAND WEBHOOK CALLED (BILLING DISABLED) ====================")
    console.log("🔔 [BLAND-WEBHOOK] Timestamp:", new Date().toISOString())

    const body = await request.json()
    console.log("🔔 [BLAND-WEBHOOK] Received webhook (logging only):", JSON.stringify(body, null, 2))

    const { 
      call_id, 
      c_id, 
      id,
      status,
      call_length,
      duration,
      corrected_duration,
      completed
    } = body

    const actualCallId = call_id || c_id || id

    if (!actualCallId) {
      console.log("⚠️ [BLAND-WEBHOOK] No call ID found in webhook")
      return NextResponse.json({ 
        message: "Webhook received (billing disabled - sync-based billing active)" 
      })
    }

    const isCompleted = completed || status === 'completed' || status === 'ended'
    const durationSeconds = corrected_duration || call_length || duration || 0

    console.log(`📝 [BLAND-WEBHOOK] Call logged:`)
    console.log(`   - Call ID: ${actualCallId}`)
    console.log(`   - Status: ${status}`)
    console.log(`   - Duration: ${durationSeconds} seconds`)
    console.log(`   - Completed: ${isCompleted}`)
    console.log(`⚠️ [BLAND-WEBHOOK] BILLING DISABLED - Call will be billed by scheduled sync`)

    return NextResponse.json({ 
      success: true,
      message: "Webhook received and logged (billing handled by scheduled sync)",
      callId: actualCallId,
      note: "Billing is now handled by the scheduled sync endpoint at /api/calls/scheduled-sync"
    })

  } catch (error: any) {
    console.error("❌ [BLAND-WEBHOOK] Error processing webhook:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message,
      note: "Webhook is disabled for billing - using scheduled sync instead"
    }, { status: 500 })
  }
}