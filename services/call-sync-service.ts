
import { executeQuery, createCall, updateCall } from '@/lib/db-utils'

export interface BlandCallResponse {
  call_id: string
  to: string
  from: string
  call_length?: number
  status?: string
  created_at?: string
  ended_at?: string
  recording_url?: string
  transcription?: string
  summary?: string
  price?: number
  ended_reason?: string
  queue_time?: number
  latency?: number
  interruptions?: number
  pathway_id?: string
}

export class CallSyncService {
  private apiKey: string
  private baseUrl = 'https://api.bland.ai/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BLAND_API_KEY || ''
  }

  /**
   * Fetch calls from Bland AI API
   */
  async fetchCallsFromBland(limit = 100, offset = 0): Promise<BlandCallResponse[]> {
    if (!this.apiKey) {
      throw new Error('Bland API key is required')
    }

    try {
      const response = await fetch(`${this.baseUrl}/calls?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Bland API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.calls || []
    } catch (error) {
      console.error('Error fetching calls from Bland:', error)
      throw error
    }
  }

  /**
   * Get a specific call by ID from Bland AI
   */
  async fetchCallById(callId: string): Promise<BlandCallResponse | null> {
    if (!this.apiKey) {
      throw new Error('Bland API key is required')
    }

    try {
      const response = await fetch(`${this.baseUrl}/calls/${callId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Bland API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error fetching call ${callId} from Bland:`, error)
      throw error
    }
  }

  /**
   * Sync a single call to the database
   */
  async syncCallToDatabase(blandCall: BlandCallResponse, userId: string): Promise<any> {
    try {
      // Find phone number ID if it exists
      const phoneNumberResult = await executeQuery(
        'SELECT id FROM phone_numbers WHERE phone_number = $1 AND user_id = $2',
        [blandCall.from, userId]
      )

      const phoneNumberId = phoneNumberResult.length > 0 ? phoneNumberResult[0].id : null

      const callData = {
        call_id: blandCall.call_id,
        user_id: userId,
        to_number: blandCall.to,
        from_number: blandCall.from,
        duration_seconds: blandCall.call_length || null,
        status: blandCall.status || null,
        recording_url: blandCall.recording_url || null,
        transcript: blandCall.transcription || null,
        summary: blandCall.summary || null,
        cost_cents: null, // Always null to trigger auto-billing
        pathway_id: blandCall.pathway_id || null,
        ended_reason: blandCall.ended_reason || null,
        phone_number_id: phoneNumberId
      }

      // Create or update the call
      const result = await createCall(callData)
      return result[0]
    } catch (error) {
      console.error('Error syncing call to database:', error)
      throw error
    }
  }

  /**
   * Sync calls for a specific user
   */
  async syncCallsForUser(userId: string, limit = 50): Promise<{
    synced: number
    errors: string[]
  }> {
    const results = {
      synced: 0,
      errors: []
    }

    try {
      // Get user's phone numbers to filter calls
      const userPhones = await executeQuery(
        'SELECT phone_number FROM phone_numbers WHERE user_id = $1',
        [userId]
      )

      if (userPhones.length === 0) {
        return { synced: 0, errors: ['No phone numbers found for user'] }
      }

      // Fetch calls from Bland AI
      const calls = await this.fetchCallsFromBland(limit)

      for (const call of calls) {
        try {
          // Only sync calls from user's phone numbers
          const isUserCall = userPhones.some(phone => phone.phone_number === call.from)
          
          if (isUserCall) {
            await this.syncCallToDatabase(call, userId)
            results.synced++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Call ${call.call_id}: ${errorMessage}`)
        }
      }

      // After syncing, process auto-billing for newly synced calls
      if (results.synced > 0) {
        try {
          const { CallBillingService } = await import('./call-billing-service')
          console.log(`💰 [SYNC] Processing auto-billing for ${results.synced} synced calls for user ${userId}`)
          
          const billingResult = await CallBillingService.processPendingBills(userId)
          console.log(`✅ [SYNC] Auto-billing result: ${billingResult.message}`)
          
          if (!billingResult.success) {
            results.errors.push(`Billing warning: ${billingResult.message}`)
          }
        } catch (error) {
          console.error('❌ [SYNC] Auto-billing failed:', error)
          results.errors.push(`Auto-billing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return results
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.errors.push(`Sync failed: ${errorMessage}`)
      return results
    }
  }

  /**
   * Sync all calls for all users
   */
  async syncAllCalls(limit = 100): Promise<{
    totalSynced: number
    userResults: Record<string, { synced: number, errors: string[] }>
  }> {
    const results = {
      totalSynced: 0,
      userResults: {}
    }

    try {
      // Get all users with phone numbers
      const users = await executeQuery(`
        SELECT DISTINCT u.id, u.email
        FROM users u
        JOIN phone_numbers pn ON u.id = pn.user_id
      `)

      for (const user of users) {
        const userResult = await this.syncCallsForUser(user.id, limit)
        results.userResults[user.email] = userResult
        results.totalSynced += userResult.synced
      }

      return results
    } catch (error) {
      console.error('Error syncing all calls:', error)
      throw error
    }
  }
}

export default CallSyncService
