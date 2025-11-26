import { db } from "@/lib/db"
import { Call } from "@/types/database"

export interface CallData {
  call_id: string
  user_id: string
  to_number: string
  from_number: string
  duration_seconds?: number
  status?: string
  recording_url?: string
  transcript?: string
  summary?: string
  cost_cents?: number
  pathway_id?: string
  ended_reason?: string
  start_time?: string
  end_time?: string
  queue_time?: number
  latency_ms?: number
  interruptions?: number
  phone_number_id?: string
}

export class CallDatabaseService {
  /**
   * Store a call in the database
   */
  static async storeCall(callData: CallData): Promise<Call> {
    const query = `
      INSERT INTO calls (
        call_id, user_id, to_number, from_number, duration_seconds, 
        status, recording_url, transcript, summary, cost_cents, 
        pathway_id, ended_reason, start_time, end_time, 
        queue_time, latency_ms, interruptions, phone_number_id,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, $18, 
        NOW(), NOW()
      ) 
      ON CONFLICT (call_id) 
      DO UPDATE SET
        duration_seconds = EXCLUDED.duration_seconds,
        status = EXCLUDED.status,
        recording_url = EXCLUDED.recording_url,
        transcript = EXCLUDED.transcript,
        summary = EXCLUDED.summary,
        cost_cents = EXCLUDED.cost_cents,
        ended_reason = EXCLUDED.ended_reason,
        end_time = EXCLUDED.end_time,
        queue_time = EXCLUDED.queue_time,
        latency_ms = EXCLUDED.latency_ms,
        interruptions = EXCLUDED.interruptions,
        updated_at = NOW()
      RETURNING *
    `

    const values = [
      callData.call_id,
      callData.user_id,
      callData.to_number,
      callData.from_number,
      callData.duration_seconds || null,
      callData.status || null,
      callData.recording_url || null,
      callData.transcript || null,
      callData.summary || null,
      callData.cost_cents || null,
      callData.pathway_id || null,
      callData.ended_reason || null,
      callData.start_time || null,
      callData.end_time || null,
      callData.queue_time || null,
      callData.latency_ms || null,
      callData.interruptions || null,
      callData.phone_number_id || null
    ]

    const result = await db.query(query, values)
    return result.rows[0]
  }

  /**
   * Get calls for a specific user
   */
  static async getCallsForUser(
    userId: string, 
    options?: {
      limit?: number
      offset?: number
      status?: string
      phoneNumber?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<{ calls: Call[], total: number }> {
    const { limit = 50, offset = 0, status, phoneNumber, startDate, endDate } = options || {}

    let whereConditions = ['c.user_id = $1']
    const values: any[] = [userId]
    let paramCount = 1

    if (status) {
      paramCount++
      whereConditions.push(`c.status = $${paramCount}`)
      values.push(status)
    }

    if (phoneNumber) {
      paramCount++
      whereConditions.push(`(c.to_number = $${paramCount} OR c.from_number = $${paramCount})`)
      values.push(phoneNumber)
    }

    if (startDate) {
      paramCount++
      whereConditions.push(`c.created_at >= $${paramCount}`)
      values.push(startDate)
    }

    if (endDate) {
      paramCount++
      whereConditions.push(`c.created_at <= $${paramCount}`)
      values.push(endDate)
    }

    const whereClause = whereConditions.join(' AND ')

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM calls c 
      WHERE ${whereClause}
    `
    const countResult = await db.query(countQuery, values)
    const total = parseInt(countResult.rows[0].total)

    // Get calls with pagination
    const callsQuery = `
      SELECT c.*, pn.phone_number as phone_number_detail
      FROM calls c
      LEFT JOIN phone_numbers pn ON c.phone_number_id = pn.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    values.push(limit, offset)
    const callsResult = await db.query(callsQuery, values)

    return {
      calls: callsResult.rows,
      total
    }
  }

  /**
   * Get a specific call by call_id
   */
  static async getCallById(callId: string): Promise<Call | null> {
    const query = `
      SELECT c.*, pn.phone_number as phone_number_detail
      FROM calls c
      LEFT JOIN phone_numbers pn ON c.phone_number_id = pn.id
      WHERE c.call_id = $1
    `

    const result = await db.query(query, [callId])
    return result.rows[0] || null
  }

  /**
   * Update call with additional data (like transcript, summary)
   */
  static async updateCall(callId: string, updateData: Partial<CallData>): Promise<Call | null> {
    const updateFields = Object.keys(updateData)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ')

    const query = `
      UPDATE calls 
      SET ${updateFields}, updated_at = NOW()
      WHERE call_id = $1
      RETURNING *
    `

    const values = [callId, ...Object.values(updateData)]
    const result = await db.query(query, values)
    return result.rows[0] || null
  }

  /**
   * Sync calls from Bland.ai API for a user
   */
  static async syncCallsForUser(userId: string, blandApiCalls: any[]): Promise<number> {
    let syncCount = 0
    const insertedCalls: Call[] = [];
    let newCallsCount = 0;

    for (const apiCall of blandApiCalls) {
      try {
        // Map Bland.ai API response to our call data format
        const callData: CallData = {
          call_id: apiCall.c_id || apiCall.id || apiCall.call_id,
          user_id: userId,
          to_number: apiCall.to || apiCall.to_number || '',
          from_number: apiCall.from || apiCall.from_number || '',
          duration_seconds: apiCall.call_length || apiCall.duration || apiCall.duration_seconds,
          status: apiCall.status,
          recording_url: apiCall.recording_url,
          transcript: apiCall.transcription || apiCall.transcript,
          summary: apiCall.summary,
          pathway_id: apiCall.pathway_id,
          ended_reason: apiCall.ended_reason,
          start_time: apiCall.started_at || apiCall.start_time,
          end_time: apiCall.ended_at || apiCall.end_time,
          queue_time: apiCall.queue_time,
          latency_ms: apiCall.latency || apiCall.latency_ms,
          interruptions: apiCall.interruptions
        }

        // Find matching phone number ID
        if (callData.from_number || callData.to_number) {
          const phoneQuery = `
            SELECT id FROM phone_numbers 
            WHERE user_id = $1 AND (phone_number = $2 OR phone_number = $3)
            LIMIT 1
          `
          const phoneResult = await db.query(phoneQuery, [
            userId, 
            callData.from_number, 
            callData.to_number
          ])

          if (phoneResult.rows[0]) {
            callData.phone_number_id = phoneResult.rows[0].id
          }
        }

        // Insert the new call
        const insertResult = await db.query(`
          INSERT INTO calls (
            call_id, user_id, to_number, from_number, duration_seconds, status,
            recording_url, transcript, summary, pathway_id, ended_reason,
            start_time, end_time, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
          ) RETURNING *
        `, [
          apiCall.c_id || apiCall.id,
          userId,
          apiCall.to_number || apiCall.to,
          apiCall.from_number || apiCall.from,
          apiCall.duration || apiCall.call_length || 0,
          apiCall.status || 'unknown',
          apiCall.recording_url || null,
          apiCall.transcription || null,
          apiCall.summary || null,
          apiCall.pathway_id || null,
          apiCall.ended_reason || null,
          apiCall.started_at || apiCall.start_time,
          apiCall.ended_at || apiCall.end_time
        ])

        const insertedCall = insertResult.rows[0]
        insertedCalls.push(insertedCall)
        newCallsCount++

        // Automatically bill completed calls with duration > 0
        if (insertedCall.status === 'completed' && insertedCall.duration_seconds > 0) {
          try {
            const { CallBillingService } = await import('./call-billing-service')
            const billingResult = await CallBillingService.billCall(
              insertedCall.call_id,
              userId,
              insertedCall.duration_seconds
            )

            if (billingResult.success) {
              console.log(`✅ [AUTO-BILLING] Successfully billed call ${insertedCall.call_id}: $${(billingResult.costCents! / 100).toFixed(2)}`)
              
              // Update the call record with the cost
              await db.query(
                'UPDATE calls SET cost_cents = $1, updated_at = NOW() WHERE call_id = $2',
                [billingResult.costCents, insertedCall.call_id]
              )
            } else {
              console.error(`❌ [AUTO-BILLING] Failed to bill call ${insertedCall.call_id}: ${billingResult.message}`)
            }
          } catch (error) {
            console.error(`❌ [AUTO-BILLING] Error billing call ${insertedCall.call_id}:`, error)
          }
        }
      } catch (error) {
        console.error(`Error syncing call ${apiCall.c_id || apiCall.id}:`, error)
      }
    }

    return newCallsCount
  }

  /**
   * Get call statistics for a user
   */
  static async getCallStats(userId: string): Promise<{
    totalCalls: number
    completedCalls: number
    failedCalls: number
    totalDuration: number
    totalCost: number
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN status = 'failed' OR status = 'error' THEN 1 END) as failed_calls,
        COALESCE(SUM(duration_seconds), 0) as total_duration,
        COALESCE(SUM(cost_cents), 0) as total_cost
      FROM calls 
      WHERE user_id = $1
    `

    const result = await db.query(query, [userId])
    const stats = result.rows[0]

    return {
      totalCalls: parseInt(stats.total_calls),
      completedCalls: parseInt(stats.completed_calls),
      failedCalls: parseInt(stats.failed_calls),
      totalDuration: parseInt(stats.total_duration),
      totalCost: parseInt(stats.total_cost)
    }
  }
}