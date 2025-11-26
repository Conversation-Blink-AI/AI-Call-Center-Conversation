import { Client } from "pg"
import { getUserFromRequest } from "./auth-utils"

/**
 * Fetches call summary data for a specific user's phone numbers
 * @param userId The ID of the user to fetch data for
 * @returns Summary of call data including total calls, average duration, etc.
 */
export async function fetchCallSummary(userId: string) {
  try {
    // First, get the user's phone numbers
    const phoneNumbers = await getUserPhoneNumbers(userId)

    if (!phoneNumbers || phoneNumbers.length === 0) {
      // User has no phone numbers, return empty data
      return {
        totalCalls: 0,
        averageDuration: 0,
        successRate: 0,
        recentCalls: [],
      }
    }

    // Extract just the phone number strings
    const phoneNumberStrings = phoneNumbers.map((p: any) => p.phone_number)

    // Fetch call data for these phone numbers
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })
    await client.connect()
    const { rows: calls, error: callsError } = await client.query(
      `SELECT * FROM calls WHERE phone_number IN (${phoneNumberStrings.map((_, i) => `$${i + 1}`).join(", ")}) ORDER BY created_at DESC`,
      phoneNumberStrings
    )
    await client.end()


    if (callsError) {
      console.error("Error fetching calls:", callsError)
      return {
        totalCalls: 0,
        averageDuration: 0,
        successRate: 0,
        recentCalls: [],
      }
    }

    // Calculate summary statistics
    const totalCalls = calls.length
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0)
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0
    const successfulCalls = calls.filter((call) => call.status === "completed").length
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

    // Get the 5 most recent calls
    const recentCalls = calls.slice(0, 5)

    return {
      totalCalls,
      averageDuration,
      successRate,
      recentCalls,
    }
  } catch (error) {
    console.error("Error in fetchCallSummary:", error)
    return {
      totalCalls: 0,
      averageDuration: 0,
      successRate: 0,
      recentCalls: [],
    }
  }
}

/**
 * Fetches recent call flows for a specific user
 * @param userId The ID of the user to fetch data for
 * @param limit Maximum number of flows to return
 * @returns Array of recent call flows
 */
export async function fetchRecentCallFlows(userId: string, limit = 5) {
  try {
    const pathways = await getUserPathways(userId)
    return pathways || []
  } catch (error) {
    console.error("Error in fetchRecentCallFlows:", error)
    return []
  }
}

export async function getUserData() {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      throw new Error("User not authenticated")
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(
      "SELECT id, email, name, company, role, phone_number, created_at, updated_at FROM users WHERE id = $1",
      [user.value.id]
    )

    await client.end()

    if (result.rows.length === 0) {
      throw new Error("User not found")
    }

    return result.rows[0]
  } catch (error) {
    console.error("Error fetching user data:", error)
    throw error
  }
}

export async function getUserPhoneNumbers(userId: string) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(
      "SELECT * FROM phone_numbers WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    )

    await client.end()

    return result.rows
  } catch (error) {
    console.error("Error fetching user phone numbers:", error)
    throw error
  }
}

export async function getUserPathways(userId: string) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(
      "SELECT * FROM pathways WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    )

    await client.end()

    return result.rows
  } catch (error) {
    console.error("Error fetching user pathways:", error)
    throw error
  }
}