import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { decryptString, hashEmail } from "@/lib/encryption"
import { normalizeEmail } from "@/lib/utils"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

function decryptMaybe(plainValue: string | null, encryptedValue: string | null) {
  if (encryptedValue) {
    try {
      return decryptString(encryptedValue)
    } catch (error) {
      console.warn("[GET-CALL-HISTORY] Failed to decrypt value:", error)
    }
  }
  return plainValue || ""
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    if (!emailParam) {
      return NextResponse.json(
        { success: false, message: "Email parameter is required" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (!process.env.DATABASE_URL) {
      console.error("[GET-CALL-HISTORY] DATABASE_URL is not set")
      return NextResponse.json(
        { success: false, message: "Database configuration error" },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    const normalizedEmail = normalizeEmail(emailParam)
    const emailHash = hashEmail(normalizedEmail)

    console.log(`[GET-CALL-HISTORY] Looking up call logs for email: ${normalizedEmail}`)

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()

      // Find the user by email hash or plaintext
      const userResult = await client.query(
        `SELECT id, email, email_enc, first_name, last_name
         FROM users
         WHERE email_hash = $1 OR LOWER(email) = LOWER($2)
         LIMIT 1`,
        [emailHash, normalizedEmail]
      )

      if (userResult.rows.length === 0) {
        console.log(`[GET-CALL-HISTORY] User not found for email: ${normalizedEmail}`)
        return NextResponse.json(
          {
            success: false,
            message: "User not found",
            email: normalizedEmail,
            callLogs: [],
            count: 0
          },
          { headers: CORS_HEADERS }
        )
      }

      const user = userResult.rows[0]
      const userEmail = decryptMaybe(user.email, user.email_enc)
      const userName =
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total
         FROM call_logs
         WHERE user_id = $1`,
        [user.id]
      )
      const total = parseInt(countResult.rows[0].total)

      // Get call logs for this user
      const callLogsResult = await client.query(
        `SELECT
          id,
          call_id,
          user_id,
          from_number,
          from_number_enc,
          to_number,
          to_number_enc,
          duration_seconds,
          status,
          cost_cents,
          created_at,
          updated_at,
          recording_url,
          recording_url_enc,
          transcript,
          transcript_enc,
          summary,
          summary_enc,
          pathway_id,
          ended_reason,
          start_time,
          end_time,
          queue_time,
          latency_ms,
          interruptions,
          phone_number_id,
          phone_number,
          phone_number_enc,
          other_party_number,
          other_party_number_enc,
          country,
          state,
          city,
          zip,
          short_from,
          short_to,
          call_timezone,
          call_time_utc
        FROM call_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [user.id, limit, offset]
      )

      const callLogs = callLogsResult.rows.map((row) => ({
        id: row.id,
        call_id: row.call_id,
        user_id: row.user_id,
        from_number: decryptMaybe(row.from_number, row.from_number_enc),
        to_number: decryptMaybe(row.to_number, row.to_number_enc),
        duration_seconds: row.duration_seconds,
        status: row.status,
        cost_cents: row.cost_cents ? parseInt(row.cost_cents) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        recording_url: decryptMaybe(row.recording_url, row.recording_url_enc),
        transcript: decryptMaybe(row.transcript, row.transcript_enc),
        summary: decryptMaybe(row.summary, row.summary_enc),
        pathway_id: row.pathway_id,
        ended_reason: row.ended_reason,
        start_time: row.start_time,
        end_time: row.end_time,
        queue_time: row.queue_time,
        latency_ms: row.latency_ms,
        interruptions: row.interruptions,
        phone_number_id: row.phone_number_id,
        phone_number: decryptMaybe(row.phone_number, row.phone_number_enc),
        other_party_number: decryptMaybe(row.other_party_number, row.other_party_number_enc),
        country: row.country,
        state: row.state,
        city: row.city,
        zip: row.zip,
        short_from: row.short_from,
        short_to: row.short_to,
        call_timezone: row.call_timezone,
        call_time_utc: row.call_time_utc
      }))

      console.log(`[GET-CALL-HISTORY] Found ${callLogs.length} call logs for user ${user.id}`)

      return NextResponse.json(
        {
          success: true,
          email: userEmail || normalizedEmail,
          user_name: userName,
          callLogs,
          count: callLogs.length,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        },
        { headers: CORS_HEADERS }
      )
    } finally {
      await client.end()
    }
  } catch (error: any) {
    console.error("[GET-CALL-HISTORY] Error:", error)
    let message = "Internal server error"
    if (error?.message?.includes("relation") && error?.message?.includes("call_logs")) {
      message = 'Database table "call_logs" does not exist. Please run the migration script.'
    }

    return NextResponse.json(
      {
        success: false,
        message
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
