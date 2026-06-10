import { db } from "@/lib/db"
import { Call } from "@/types/database"
import { encryptString, hashPhoneNumber } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"
import {
  extractBlandTranscript,
  parseBlandDuration,
} from "@/lib/bland-webhook-utils"

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
    const toNumber = callData.to_number ? toE164Format(callData.to_number) : ""
    const fromNumber = callData.from_number ? toE164Format(callData.from_number) : ""
    const query = `
      INSERT INTO call_logs (
        call_id, user_id, to_number, from_number,
        to_number_enc, to_number_hash, from_number_enc, from_number_hash,
        duration_seconds, status, recording_url, recording_url_enc, transcript, transcript_enc, summary, summary_enc,
        pathway_id, ended_reason, start_time, end_time, 
        queue_time, latency_ms, interruptions, phone_number_id,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        NOW(), NOW()
      ) 
      ON CONFLICT (call_id) 
      DO UPDATE SET
        duration_seconds = COALESCE(EXCLUDED.duration_seconds, call_logs.duration_seconds),
        status = COALESCE(EXCLUDED.status, call_logs.status),
        recording_url = COALESCE(EXCLUDED.recording_url, call_logs.recording_url),
        recording_url_enc = COALESCE(EXCLUDED.recording_url_enc, call_logs.recording_url_enc),
        transcript = COALESCE(EXCLUDED.transcript, call_logs.transcript),
        transcript_enc = COALESCE(EXCLUDED.transcript_enc, call_logs.transcript_enc),
        summary = COALESCE(EXCLUDED.summary, call_logs.summary),
        summary_enc = COALESCE(EXCLUDED.summary_enc, call_logs.summary_enc),
        ended_reason = COALESCE(EXCLUDED.ended_reason, call_logs.ended_reason),
        end_time = COALESCE(EXCLUDED.end_time, call_logs.end_time),
        queue_time = COALESCE(EXCLUDED.queue_time, call_logs.queue_time),
        latency_ms = COALESCE(EXCLUDED.latency_ms, call_logs.latency_ms),
        interruptions = COALESCE(EXCLUDED.interruptions, call_logs.interruptions),
        updated_at = NOW()
      RETURNING *
    `

    const values = [
      callData.call_id,
      callData.user_id,
      toNumber,
      fromNumber,
      toNumber ? encryptString(toNumber) : null,
      toNumber ? hashPhoneNumber(toNumber) : null,
      fromNumber ? encryptString(fromNumber) : null,
      fromNumber ? hashPhoneNumber(fromNumber) : null,
      callData.duration_seconds || null,
      callData.status || null,
      callData.recording_url || null,
      callData.recording_url ? encryptString(callData.recording_url) : null,
      callData.transcript || null,
      callData.transcript ? encryptString(callData.transcript) : null,
      callData.summary || null,
      callData.summary ? encryptString(callData.summary) : null,
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
      metaCapiStatus?: 'fired' | 'failed' | 'not_fired'
    }
  ): Promise<{ calls: Call[], total: number }> {
    const { limit = 50, offset = 0, status, phoneNumber, startDate, endDate, metaCapiStatus } = options || {}

    let whereConditions = ['c.user_id = $1']
    const values: any[] = [userId]
    let paramCount = 1

    if (status) {
      paramCount++
      whereConditions.push(`c.status = $${paramCount}`)
      values.push(status)
    }

    if (phoneNumber) {
      const normalizedPhone = toE164Format(phoneNumber)
      const phoneHash = hashPhoneNumber(normalizedPhone)
      paramCount++
      const hashParam = paramCount
      paramCount++
      const phoneParam = paramCount
      whereConditions.push(`(c.to_number_hash = $${hashParam} OR c.from_number_hash = $${hashParam} OR c.to_number = $${phoneParam} OR c.from_number = $${phoneParam})`)
      values.push(phoneHash)
      values.push(normalizedPhone)
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

    if (metaCapiStatus === 'fired') {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM meta_capi_events e
        WHERE e.call_id = c.call_id
          AND e.response_status IS NOT NULL AND e.response_status < 300
      )`)
    } else if (metaCapiStatus === 'failed') {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM meta_capi_events e WHERE e.call_id = c.call_id
      )`)
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM meta_capi_events e
        WHERE e.call_id = c.call_id
          AND e.response_status IS NOT NULL AND e.response_status < 300
      )`)
    } else if (metaCapiStatus === 'not_fired') {
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM meta_capi_events e WHERE e.call_id = c.call_id
      )`)
    }

    const whereClause = whereConditions.join(' AND ')

    const metaCapiStatusSelect = `
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM meta_capi_events e WHERE e.call_id = c.call_id) THEN 'not_fired'
        WHEN EXISTS (
          SELECT 1 FROM meta_capi_events e
          WHERE e.call_id = c.call_id
            AND e.response_status IS NOT NULL AND e.response_status < 300
        ) THEN 'fired'
        ELSE 'failed'
      END AS meta_capi_status
    `

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM call_logs c 
      WHERE ${whereClause}
    `
    const countResult = await db.query(countQuery, values)
    const total = parseInt(countResult.rows[0].total)

    // Get calls with pagination
    const callsQuery = `
      SELECT c.*, pn.phone_number as phone_number_detail, ${metaCapiStatusSelect}
      FROM call_logs c
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
      FROM call_logs c
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
      UPDATE call_logs 
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
          duration_seconds: parseBlandDuration(apiCall),
          status: apiCall.status,
          recording_url: apiCall.recording_url,
          transcript: extractBlandTranscript(apiCall),
          summary: apiCall.summary,
          pathway_id: apiCall.pathway_id,
          ended_reason: apiCall.ended_reason || apiCall.call_ended_by,
          start_time: apiCall.started_at || apiCall.start_time,
          end_time: apiCall.ended_at || apiCall.end_time,
          queue_time: apiCall.queue_time,
          latency_ms: apiCall.latency || apiCall.latency_ms,
          interruptions: apiCall.interruptions
        }

        // Find matching phone number ID
        if (callData.from_number || callData.to_number) {
          const normalizedFrom = callData.from_number ? toE164Format(callData.from_number) : ""
          const normalizedTo = callData.to_number ? toE164Format(callData.to_number) : ""
          const fromHash = normalizedFrom ? hashPhoneNumber(normalizedFrom) : ""
          const toHash = normalizedTo ? hashPhoneNumber(normalizedTo) : ""
          const phoneQuery = `
            SELECT id FROM phone_numbers 
            WHERE user_id = $1 AND (
              phone_number_hash = $2 OR phone_number_hash = $3
              OR phone_number = $4 OR phone_number = $5
            )
            LIMIT 1
          `
          const phoneResult = await db.query(phoneQuery, [
            userId, 
            fromHash,
            toHash,
            normalizedFrom,
            normalizedTo
          ])

          if (phoneResult.rows[0]) {
            callData.phone_number_id = phoneResult.rows[0].id
          }
        }

        // Insert the new call
        const rawToNumber = apiCall.to_number || apiCall.to
        const rawFromNumber = apiCall.from_number || apiCall.from
        const normalizedTo = rawToNumber ? toE164Format(rawToNumber) : ""
        const normalizedFrom = rawFromNumber ? toE164Format(rawFromNumber) : ""
        const transcript = extractBlandTranscript(apiCall)
        const insertResult = await db.query(`
          INSERT INTO call_logs (
            call_id, user_id, to_number, from_number,
            to_number_enc, to_number_hash, from_number_enc, from_number_hash,
            duration_seconds, status, recording_url, recording_url_enc, transcript, transcript_enc, summary, summary_enc,
            pathway_id, ended_reason,
            start_time, end_time, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, NOW(), NOW()
          ) RETURNING *
        `, [
          apiCall.c_id || apiCall.id,
          userId,
          normalizedTo || null,
          normalizedFrom || null,
          normalizedTo ? encryptString(normalizedTo) : null,
          normalizedTo ? hashPhoneNumber(normalizedTo) : null,
          normalizedFrom ? encryptString(normalizedFrom) : null,
          normalizedFrom ? hashPhoneNumber(normalizedFrom) : null,
          parseBlandDuration(apiCall) || 0,
          apiCall.status || 'unknown',
          apiCall.recording_url || null,
          apiCall.recording_url ? encryptString(apiCall.recording_url) : null,
          transcript,
          transcript ? encryptString(transcript) : null,
          apiCall.summary || null,
          apiCall.summary ? encryptString(apiCall.summary) : null,
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
              
              // Note: cost_cents column doesn't exist in call_logs table
              // Cost is tracked in separate call_costs table if needed
              console.log(`💰 [AUTO-BILLING] Cost tracked: $${(billingResult.costCents! / 100).toFixed(2)}`)
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
    transferredCalls: number
    totalDuration: number
    totalCost: number
  }> {
    return this.getCallStatsForRange(userId)
  }

  /**
   * Get call statistics for a user within a date range
   */
  static async getCallStatsForRange(
    userId: string,
    options?: {
      startDate?: string
      endDate?: string
    }
  ): Promise<{
    totalCalls: number
    completedCalls: number
    failedCalls: number
    transferredCalls: number
    totalDuration: number
    totalCost: number
  }> {
    const { startDate, endDate } = options || {}

    const whereConditions = ['user_id = $1']
    const values: any[] = [userId]
    let paramCount = 1

    if (startDate) {
      paramCount++
      whereConditions.push(`created_at >= $${paramCount}`)
      values.push(startDate)
    }

    if (endDate) {
      paramCount++
      whereConditions.push(`created_at <= $${paramCount}`)
      values.push(endDate)
    }

    const whereClause = whereConditions.join(' AND ')

    const query = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN status = 'failed' OR status = 'error' THEN 1 END) as failed_calls,
        COUNT(
          CASE 
            WHEN (transferred_to IS NOT NULL AND TRIM(transferred_to) != '')
              OR ended_reason ILIKE '%transfer%' 
              OR ended_reason ILIKE '%transferred%'
              OR ended_reason ILIKE '%transfered%'
            THEN 1 
          END
        ) as transferred_calls,
        COALESCE(SUM(duration_seconds), 0) as total_duration,
        0 as total_cost
      FROM call_logs 
      WHERE ${whereClause}
    `

    const result = await db.query(query, values)
    const stats = result.rows[0]

    return {
      totalCalls: parseInt(stats.total_calls),
      completedCalls: parseInt(stats.completed_calls),
      failedCalls: parseInt(stats.failed_calls),
      transferredCalls: parseInt(stats.transferred_calls),
      totalDuration: parseInt(stats.total_duration),
      totalCost: parseInt(stats.total_cost)
    }
  }
}