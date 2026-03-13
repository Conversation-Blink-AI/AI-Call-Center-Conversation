import { db } from "@/lib/db"
import { toE164Format } from "@/utils/phone-utils"
import { decryptString, hashPhoneNumber } from "@/lib/encryption"

export interface BlockResult {
  success: boolean
  message: string
  blockId?: number
  phoneNumber?: string
}

export interface UnblockResult {
  success: boolean
  message: string
  phoneNumber?: string
}

export class PhoneBlockService {
  private static readonly BLAND_API_BASE_URL = 'https://api.bland.ai/v1'
  private static readonly BLOCK_REASON = "Insufficient wallet balance"

  /**
   * Get Bland AI API key from environment
   */
  private static getApiKey(): string {
    const apiKey = process.env.BLAND_AI_API_KEY
    if (!apiKey) {
      throw new Error('BLAND_AI_API_KEY environment variable is not set')
    }
    return apiKey.trim()
  }

  /**
   * Get all phone numbers for a user from database
   */
  private static async getUserPhoneNumbers(userId: string): Promise<Array<{ phone_number: string; bland_block_id: number | null }>> {
    try {
      const result = await db.query(
        'SELECT phone_number, phone_number_enc, bland_block_id FROM phone_numbers WHERE user_id = $1',
        [userId]
      )
      return (result.rows || []).map((row: any) => ({
        phone_number: row.phone_number_enc ? decryptString(row.phone_number_enc) : row.phone_number,
        bland_block_id: row.bland_block_id
      }))
    } catch (error) {
      console.error(`❌ [PHONE-BLOCK] Error fetching phone numbers for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Block a single phone number via Bland AI API
   */
  private static async blockNumber(phoneNumber: string): Promise<number> {
    const apiKey = this.getApiKey()
    const formattedNumber = toE164Format(phoneNumber)

    console.log(`🚫 [PHONE-BLOCK] Blocking number: ${formattedNumber}`)

    const response = await fetch(`${this.BLAND_API_BASE_URL}/blocked_numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        numbers: [formattedNumber],
        is_global: false,
        inbound_number: formattedNumber,
        reason: this.BLOCK_REASON
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [PHONE-BLOCK] Failed to block ${formattedNumber}:`, response.status, errorText)
      throw new Error(`Bland AI API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.data || !data.data.blocks || data.data.blocks.length === 0) {
      throw new Error('No block ID returned from Bland AI API')
    }

    const blockId = data.data.blocks[0].id
    console.log(`✅ [PHONE-BLOCK] Successfully blocked ${formattedNumber}, block ID: ${blockId}`)
    
    return blockId
  }

  /**
   * Unblock a single phone number via Bland AI API
   */
  private static async unblockNumber(blockId: number, phoneNumber: string): Promise<void> {
    const apiKey = this.getApiKey()

    console.log(`🔓 [PHONE-BLOCK] Unblocking number: ${phoneNumber} (block ID: ${blockId})`)

    const response = await fetch(`${this.BLAND_API_BASE_URL}/blocked_numbers/${blockId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      // If block doesn't exist (404), that's okay - it's already unblocked
      if (response.status === 404) {
        console.log(`⚠️ [PHONE-BLOCK] Block ${blockId} not found (already unblocked?)`)
        return
      }
      const errorText = await response.text()
      console.error(`❌ [PHONE-BLOCK] Failed to unblock ${phoneNumber}:`, response.status, errorText)
      throw new Error(`Bland AI API error: ${response.status} ${errorText}`)
    }

    console.log(`✅ [PHONE-BLOCK] Successfully unblocked ${phoneNumber}`)
  }

  /**
   * Update block ID in database after blocking
   */
  private static async updateBlockId(phoneNumber: string, userId: string, blockId: number): Promise<void> {
    try {
      const normalizedPhone = toE164Format(phoneNumber)
      const phoneHash = hashPhoneNumber(normalizedPhone)
      await db.query(
        'UPDATE phone_numbers SET bland_block_id = $1 WHERE user_id = $2 AND (phone_number_hash = $3 OR phone_number = $4)',
        [blockId, userId, phoneHash, normalizedPhone]
      )
      console.log(`✅ [PHONE-BLOCK] Updated block ID ${blockId} for ${phoneNumber}`)
    } catch (error) {
      console.error(`❌ [PHONE-BLOCK] Error updating block ID for ${phoneNumber}:`, error)
      throw error
    }
  }

  /**
   * Clear block ID in database after unblocking
   */
  private static async clearBlockId(phoneNumber: string, userId: string): Promise<void> {
    try {
      const normalizedPhone = toE164Format(phoneNumber)
      const phoneHash = hashPhoneNumber(normalizedPhone)
      await db.query(
        'UPDATE phone_numbers SET bland_block_id = NULL WHERE user_id = $1 AND (phone_number_hash = $2 OR phone_number = $3)',
        [userId, phoneHash, normalizedPhone]
      )
      console.log(`✅ [PHONE-BLOCK] Cleared block ID for ${phoneNumber}`)
    } catch (error) {
      console.error(`❌ [PHONE-BLOCK] Error clearing block ID for ${phoneNumber}:`, error)
      throw error
    }
  }

  /**
   * Block all phone numbers for a user when balance becomes 0 or negative
   */
  static async blockUserNumbers(userId: string): Promise<BlockResult[]> {
    const results: BlockResult[] = []

    try {
      console.log(`🚫 [PHONE-BLOCK] Starting block process for user: ${userId}`)
      
      const phoneNumbers = await this.getUserPhoneNumbers(userId)

      if (phoneNumbers.length === 0) {
        console.log(`⚠️ [PHONE-BLOCK] No phone numbers found for user ${userId}`)
        return results
      }

      console.log(`📞 [PHONE-BLOCK] Found ${phoneNumbers.length} phone number(s) for user ${userId}`)

      // Block each number sequentially (to respect rate limits)
      for (const phone of phoneNumbers) {
        try {
          // Skip if already blocked (idempotency check)
          if (phone.bland_block_id !== null) {
            console.log(`⚠️ [PHONE-BLOCK] Number ${phone.phone_number} already blocked (block ID: ${phone.bland_block_id}), skipping`)
            results.push({
              success: true,
              message: 'Number already blocked',
              blockId: phone.bland_block_id,
              phoneNumber: phone.phone_number
            })
            continue
          }

          // Block the number via API
          const blockId = await this.blockNumber(phone.phone_number)

          // Store block ID in database
          await this.updateBlockId(phone.phone_number, userId, blockId)

          results.push({
            success: true,
            message: 'Number blocked successfully',
            blockId,
            phoneNumber: phone.phone_number
          })
        } catch (error: any) {
          console.error(`❌ [PHONE-BLOCK] Failed to block ${phone.phone_number}:`, error)
          results.push({
            success: false,
            message: error.message || 'Failed to block number',
            phoneNumber: phone.phone_number
          })
          // Continue with other numbers even if one fails
        }
      }

      const successCount = results.filter(r => r.success).length
      console.log(`✅ [PHONE-BLOCK] Block process completed for user ${userId}: ${successCount}/${phoneNumbers.length} numbers blocked`)
      
      return results
    } catch (error: any) {
      console.error(`❌ [PHONE-BLOCK] Error blocking numbers for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Unblock all phone numbers for a user when balance becomes positive
   */
  static async unblockUserNumbers(userId: string): Promise<UnblockResult[]> {
    const results: UnblockResult[] = []

    try {
      console.log(`🔓 [PHONE-BLOCK] Starting unblock process for user: ${userId}`)
      
      const phoneNumbers = await this.getUserPhoneNumbers(userId)

      if (phoneNumbers.length === 0) {
        console.log(`⚠️ [PHONE-BLOCK] No phone numbers found for user ${userId}`)
        return results
      }

      // Filter to only numbers that have a block ID (are blocked)
      const blockedNumbers = phoneNumbers.filter(phone => phone.bland_block_id !== null)

      if (blockedNumbers.length === 0) {
        console.log(`⚠️ [PHONE-BLOCK] No blocked numbers found for user ${userId}`)
        return results
      }

      console.log(`📞 [PHONE-BLOCK] Found ${blockedNumbers.length} blocked number(s) for user ${userId}`)

      // Unblock each number sequentially
      for (const phone of blockedNumbers) {
        try {
          if (phone.bland_block_id === null) {
            // This shouldn't happen due to filter, but double-check
            continue
          }

          // Unblock the number via API
          await this.unblockNumber(phone.bland_block_id, phone.phone_number)

          // Clear block ID in database
          await this.clearBlockId(phone.phone_number, userId)

          results.push({
            success: true,
            message: 'Number unblocked successfully',
            phoneNumber: phone.phone_number
          })
        } catch (error: any) {
          console.error(`❌ [PHONE-BLOCK] Failed to unblock ${phone.phone_number}:`, error)
          results.push({
            success: false,
            message: error.message || 'Failed to unblock number',
            phoneNumber: phone.phone_number
          })
          // Continue with other numbers even if one fails
        }
      }

      const successCount = results.filter(r => r.success).length
      console.log(`✅ [PHONE-BLOCK] Unblock process completed for user ${userId}: ${successCount}/${blockedNumbers.length} numbers unblocked`)
      
      return results
    } catch (error: any) {
      console.error(`❌ [PHONE-BLOCK] Error unblocking numbers for user ${userId}:`, error)
      throw error
    }
  }
}


