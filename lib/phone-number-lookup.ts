import { executeQuery } from './db-utils'
import { toE164Format } from '@/utils/phone-utils'

export interface PhoneNumberLookupResult {
  user_id: string
  phone_number_id: string
}

/**
 * Normalizes a phone number for database lookup
 * Tries multiple formats to handle different phone number representations
 */
function normalizePhoneForLookup(phoneNumber: string): string[] {
  if (!phoneNumber) return []

  // Convert to E.164 format
  const e164 = toE164Format(phoneNumber)
  
  // Remove all non-digits for comparison
  const digitsOnly = phoneNumber.replace(/\D/g, '')
  
  // For US numbers, try with and without country code
  const variations: string[] = [e164]
  
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // Try without country code
    variations.push(`+${digitsOnly.slice(1)}`)
    variations.push(digitsOnly.slice(1))
  } else if (digitsOnly.length === 10) {
    // Try with country code
    variations.push(`+1${digitsOnly}`)
    variations.push(`1${digitsOnly}`)
  }
  
  // Also try the original format if different
  if (phoneNumber !== e164) {
    variations.push(phoneNumber)
  }
  
  // Add digits-only version
  if (digitsOnly && !variations.includes(digitsOnly)) {
    variations.push(digitsOnly)
  }
  
  // Remove duplicates and empty strings
  return [...new Set(variations.filter(Boolean))]
}

/**
 * Finds a user by phone number
 * Tries both from_number and to_number fields
 * Returns user_id and phone_number_id if found, null otherwise
 */
export async function findUserByPhoneNumber(
  fromNumber?: string,
  toNumber?: string
): Promise<PhoneNumberLookupResult | null> {
  try {
    // Try from_number first (typically the user's purchased number)
    if (fromNumber) {
      const fromVariations = normalizePhoneForLookup(fromNumber)
      
      // Build query with all variations
      const placeholders = fromVariations.map((_, i) => `$${i + 1}`).join(', ')
      const result = await executeQuery(
        `SELECT user_id, id as phone_number_id 
         FROM phone_numbers 
         WHERE phone_number IN (${placeholders})
         LIMIT 1`,
        fromVariations
      )
      
      if (result.length > 0) {
        return {
          user_id: result[0].user_id,
          phone_number_id: result[0].phone_number_id
        }
      }
    }
    
    // Fall back to to_number if from_number lookup failed
    if (toNumber) {
      const toVariations = normalizePhoneForLookup(toNumber)
      
      // Build query with all variations
      const placeholders = toVariations.map((_, i) => `$${i + 1}`).join(', ')
      const result = await executeQuery(
        `SELECT user_id, id as phone_number_id 
         FROM phone_numbers 
         WHERE phone_number IN (${placeholders})
         LIMIT 1`,
        toVariations
      )
      
      if (result.length > 0) {
        return {
          user_id: result[0].user_id,
          phone_number_id: result[0].phone_number_id
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('[PHONE-LOOKUP] Error finding user by phone number:', error)
    return null
  }
}

