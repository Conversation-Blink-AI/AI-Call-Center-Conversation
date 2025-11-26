
import { db } from "@/lib/db"

export interface CallBillingResult {
  success: boolean
  message: string
  callId?: string
  costCents?: number
  walletBalance?: number
}

export class CallBillingService {
  // Standard rate: $0.11 per minute (11 cents)
  static readonly RATE_PER_MINUTE_CENTS = 11

  /**
   * Process billing for unbilled completed calls
   */
  static async processPendingBills(userId?: string): Promise<{
    success: boolean
    processedCalls: number
    totalCostCents: number
    message: string
  }> {
    try {
      // Find completed calls that haven't been billed yet (cost_cents is null)
      let query = `
        SELECT id, call_id, user_id, duration_seconds, status, created_at
        FROM calls 
        WHERE status = 'completed' 
        AND duration_seconds > 0 
        AND cost_cents IS NULL
      `
      const values: any[] = []

      if (userId) {
        query += ` AND user_id = $1`
        values.push(userId)
      }

      query += ` ORDER BY created_at ASC`

      const result = await db.query(query, values)
      const unbilledCalls = result.rows

      console.log(`💰 [BILLING] Found ${unbilledCalls.length} unbilled calls to process`)

      let processedCalls = 0
      let totalCostCents = 0

      for (const call of unbilledCalls) {
        try {
          const billingResult = await this.billCall(
            call.call_id,
            call.user_id,
            call.duration_seconds
          )

          if (billingResult.success && billingResult.costCents) {
            processedCalls++
            totalCostCents += billingResult.costCents
            console.log(`✅ [BILLING] Billed call ${call.call_id}: $${(billingResult.costCents / 100).toFixed(2)}`)
          } else {
            console.error(`❌ [BILLING] Failed to bill call ${call.call_id}: ${billingResult.message}`)
          }
        } catch (error) {
          console.error(`❌ [BILLING] Error billing call ${call.call_id}:`, error)
        }
      }

      return {
        success: true,
        processedCalls,
        totalCostCents,
        message: `Processed ${processedCalls} calls, total cost: $${(totalCostCents / 100).toFixed(2)}`
      }

    } catch (error) {
      console.error('❌ [BILLING] Error processing pending bills:', error)
      return {
        success: false,
        processedCalls: 0,
        totalCostCents: 0,
        message: 'Failed to process pending bills'
      }
    }
  }

  /**
   * Bill a specific call
   */
  static async billCall(
    callId: string,
    userId: string,
    durationSeconds: number
  ): Promise<CallBillingResult> {
    try {
      console.log(`💰 [BILLING] Processing call billing:`)
      console.log(`   - Call ID: ${callId}`)
      console.log(`   - User ID: ${userId}`)
      console.log(`   - Duration: ${durationSeconds} seconds`)

      // Calculate cost: duration in minutes * rate per minute
      const durationMinutes = Math.ceil(durationSeconds / 60) // Round up to next minute
      const costCents = durationMinutes * this.RATE_PER_MINUTE_CENTS

      console.log(`   - Duration (minutes): ${durationMinutes}`)
      console.log(`   - Cost: $${(costCents / 100).toFixed(2)}`)

      // Start transaction
      await db.query('BEGIN')

      try {
        // Check user's current wallet balance
        const walletResult = await db.query(
          'SELECT id, balance_cents FROM wallets WHERE user_id = $1',
          [userId]
        )

        if (walletResult.rows.length === 0) {
          await db.query('ROLLBACK')
          return {
            success: false,
            message: 'Wallet not found for user'
          }
        }

        const currentBalance = walletResult.rows[0].balance_cents || 0

        if (currentBalance < costCents) {
          await db.query('ROLLBACK')
          return {
            success: false,
            message: `Insufficient funds. Required: $${(costCents / 100).toFixed(2)}, Available: $${(currentBalance / 100).toFixed(2)}`,
            costCents
          }
        }

        // Deduct from wallet
        const newBalance = currentBalance - costCents
        await db.query(
          'UPDATE wallets SET balance_cents = $1, updated_at = NOW() WHERE user_id = $2',
          [newBalance, userId]
        )

        // Update call with cost
        await db.query(
          'UPDATE calls SET cost_cents = $1, updated_at = NOW() WHERE call_id = $2',
          [costCents, callId]
        )

        // Get wallet ID for transaction record
        const walletId = walletResult.rows[0].id

        // Record transaction
        await db.query(`
          INSERT INTO wallet_transactions (
            wallet_id, amount_cents, type, metadata, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          walletId,
          -costCents, // Negative for debit
          'debit',
          JSON.stringify({
            call_id: callId,
            duration_minutes: durationMinutes,
            description: `Call charge for ${durationMinutes} minutes`
          })
        ])

        await db.query('COMMIT')

        console.log(`✅ [BILLING] Successfully billed call ${callId}`)
        console.log(`   - Charged: $${(costCents / 100).toFixed(2)}`)
        console.log(`   - New balance: $${(newBalance / 100).toFixed(2)}`)

        return {
          success: true,
          message: `Call billed successfully. Charged: $${(costCents / 100).toFixed(2)}`,
          callId,
          costCents,
          walletBalance: newBalance
        }

      } catch (error) {
        await db.query('ROLLBACK')
        throw error
      }

    } catch (error: any) {
      console.error(`❌ [BILLING] Error billing call ${callId}:`, error)
      return {
        success: false,
        message: `Billing failed: ${error.message}`,
        callId
      }
    }
  }

  /**
   * Get billing statistics for a user
   */
  static async getBillingStats(userId: string): Promise<{
    totalBilledCalls: number
    totalSpentCents: number
    unbilledCalls: number
    estimatedUnbilledCostCents: number
  }> {
    try {
      // Get billed calls stats
      const billedResult = await db.query(`
        SELECT 
          COUNT(*) as total_billed,
          COALESCE(SUM(cost_cents), 0) as total_spent
        FROM calls 
        WHERE user_id = $1 AND cost_cents IS NOT NULL
      `, [userId])

      // Get unbilled calls stats
      const unbilledResult = await db.query(`
        SELECT 
          COUNT(*) as total_unbilled,
          COALESCE(SUM(CEIL(duration_seconds::float / 60) * ${this.RATE_PER_MINUTE_CENTS}), 0) as estimated_cost
        FROM calls 
        WHERE user_id = $1 
        AND status = 'completed' 
        AND duration_seconds > 0 
        AND cost_cents IS NULL
      `, [userId])

      return {
        totalBilledCalls: parseInt(billedResult.rows[0].total_billed),
        totalSpentCents: parseInt(billedResult.rows[0].total_spent),
        unbilledCalls: parseInt(unbilledResult.rows[0].total_unbilled),
        estimatedUnbilledCostCents: parseInt(unbilledResult.rows[0].estimated_cost)
      }

    } catch (error) {
      console.error('❌ [BILLING] Error getting billing stats:', error)
      return {
        totalBilledCalls: 0,
        totalSpentCents: 0,
        unbilledCalls: 0,
        estimatedUnbilledCostCents: 0
      }
    }
  }
}
