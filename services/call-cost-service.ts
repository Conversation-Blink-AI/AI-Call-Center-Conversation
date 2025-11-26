
import { db } from "@/lib/db"
import { calculateCallCost } from "@/config/pricing"

export interface CallCostData {
  callId: string
  userId: string
  durationSeconds: number
  costCents: number
  ratePerMinuteCents: number
}

export class CallCostService {
  
  static async processCallCost(callData: {
    callId: string
    userId: string
    durationSeconds: number
  }): Promise<{ success: boolean; message: string; costCents?: number }> {
    
    const { callId, userId, durationSeconds } = callData
    
    try {
      console.log(`💰 [CALL-COST] Processing cost for call ${callId}, duration: ${durationSeconds}s`)
      
      // Check if this call cost has already been processed
      const existingCost = await db.query(
        'SELECT id FROM call_costs WHERE call_id = $1',
        [callId]
      )
      
      if (existingCost.rows.length > 0) {
        console.log(`⚠️ [CALL-COST] Call ${callId} already processed, skipping`)
        return { success: true, message: "Call cost already processed" }
      }
      
      // Calculate the cost
      const { costCents, durationMinutes, ratePerMinuteCents } = calculateCallCost(durationSeconds)
      
      if (costCents <= 0) {
        console.log(`⚠️ [CALL-COST] No cost to deduct for call ${callId}`)
        return { success: true, message: "No cost to deduct", costCents: 0 }
      }
      
      // Check user's wallet balance
      const walletResult = await db.query(
        'SELECT id, balance_cents FROM wallets WHERE user_id = $1',
        [userId]
      )
      
      if (walletResult.rows.length === 0) {
        console.log(`❌ [CALL-COST] No wallet found for user ${userId}`)
        return { success: false, message: "No wallet found for user" }
      }
      
      const wallet = walletResult.rows[0]
      const currentBalance = parseInt(wallet.balance_cents)
      
      if (currentBalance < costCents) {
        console.log(`❌ [CALL-COST] Insufficient funds. Balance: ${currentBalance}, Cost: ${costCents}`)
        return { success: false, message: "Insufficient wallet balance" }
      }
      
      // Start transaction
      console.log(`💳 [CALL-COST] Deducting ${costCents} cents from wallet ${wallet.id}`)
      
      // 1. Deduct from wallet
      const newBalance = currentBalance - costCents
      await db.query(
        'UPDATE wallets SET balance_cents = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, wallet.id]
      )
      
      // 2. Create wallet transaction record
      await db.query(`
        INSERT INTO wallet_transactions (wallet_id, amount_cents, type, metadata, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        wallet.id,
        -costCents, // Negative for debit
        'debit',
        JSON.stringify({
          call_id: callId,
          duration_seconds: durationSeconds,
          duration_minutes: durationMinutes,
          rate_per_minute_cents: ratePerMinuteCents,
          reason: 'call_cost'
        })
      ])
      
      // 3. Create call cost record
      await db.query(`
        INSERT INTO call_costs (call_id, user_id, duration_seconds, cost_cents, rate_per_minute_cents, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        callId,
        userId,
        durationSeconds,
        costCents,
        ratePerMinuteCents
      ])
      
      console.log(`✅ [CALL-COST] Successfully processed call cost:`)
      console.log(`   - Call ID: ${callId}`)
      console.log(`   - Duration: ${durationSeconds}s (${durationMinutes} minutes)`)
      console.log(`   - Cost: ${costCents} cents`)
      console.log(`   - Old Balance: ${currentBalance} cents`)
      console.log(`   - New Balance: ${newBalance} cents`)
      
      return { 
        success: true, 
        message: `Call cost processed: ${costCents} cents deducted`,
        costCents 
      }
      
    } catch (error: any) {
      console.error(`❌ [CALL-COST] Error processing call cost for ${callId}:`, error)
      return { success: false, message: `Error processing call cost: ${error.message}` }
    }
  }
  
  static async getCallCosts(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await db.query(`
        SELECT 
          cc.*,
          wt.created_at as charged_at
        FROM call_costs cc
        LEFT JOIN wallet_transactions wt ON wt.metadata->>'call_id' = cc.call_id
        WHERE cc.user_id = $1
        ORDER BY cc.created_at DESC
        LIMIT $2
      `, [userId, limit])
      
      return result.rows
    } catch (error) {
      console.error('Error fetching call costs:', error)
      return []
    }
  }
}
