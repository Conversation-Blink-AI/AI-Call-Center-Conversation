import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db-client"
import { decryptString, hashPhoneNumber } from "@/lib/encryption"
import { normalizeEmail } from "@/lib/utils"
import { toE164Format } from "@/utils/phone-utils"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

/** UUID v4-style (accepts any variant nibble in version/clock bits) */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VERIFY_FAILED_MESSAGE =
  "Email, userId, and purchased number could not be verified"

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

/** Variations for matching stored phone_number (plaintext / E.164) */
function collectPhoneVariations(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const e164 = toE164Format(trimmed)
  const digitsOnly = trimmed.replace(/\D/g, "")
  const set = new Set<string>([trimmed, e164])
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    set.add(`+${digitsOnly}`)
    set.add(digitsOnly.slice(1))
  }
  if (digitsOnly.length === 10) {
    set.add(`+1${digitsOnly}`)
    set.add(digitsOnly)
  }
  return [...set].filter(Boolean)
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")
    const userIdParam =
      searchParams.get("userId")?.trim() || searchParams.get("user_id")?.trim() || null
    const purchasedNumberParam =
      searchParams.get("phoneNumber")?.trim() ||
      searchParams.get("purchasedNumber")?.trim() ||
      null

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    if (!emailParam || !userIdParam || !purchasedNumberParam) {
      return NextResponse.json(
        {
          success: false,
          message:
            "email, userId, and phoneNumber (purchased number from getPurchaseNumber) are all required"
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (!UUID_REGEX.test(userIdParam)) {
      return NextResponse.json(
        { success: false, message: "userId must be a valid UUID" },
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

    console.log(
      `[GET-CALL-HISTORY] Verifying email + userId + purchased number for user id: ${userIdParam}`
    )

    const pool = getPool()

    // 1) Load user by id only (no email-only lookup)
    const userResult = await pool.query(
      `SELECT id, email, email_enc, first_name, last_name
       FROM users
       WHERE id = $1::uuid
       LIMIT 1`,
      [userIdParam]
    )

    if (userResult.rows.length === 0) {
      console.log(`[GET-CALL-HISTORY] Verification failed: no user for id ${userIdParam}`)
      return NextResponse.json(
        {
          success: false,
          message: VERIFY_FAILED_MESSAGE,
          callLogs: [],
          count: 0
        },
        { headers: CORS_HEADERS }
      )
    }

    const user = userResult.rows[0]
    const userEmailDecrypted = decryptMaybe(user.email, user.email_enc)
    const normalizedStoredEmail = normalizeEmail(userEmailDecrypted)

    // 2) Provided email must match the account for this userId
    if (normalizedStoredEmail !== normalizedEmail) {
      console.log(`[GET-CALL-HISTORY] Verification failed: email mismatch for user ${user.id}`)
      return NextResponse.json(
        {
          success: false,
          message: VERIFY_FAILED_MESSAGE,
          callLogs: [],
          count: 0
        },
        { headers: CORS_HEADERS }
      )
    }

    // 3) Purchased number must belong to this user
    const variations = collectPhoneVariations(purchasedNumberParam)
    const phoneHash = hashPhoneNumber(purchasedNumberParam)

    const phoneCheck = await pool.query(
      `SELECT id FROM phone_numbers
       WHERE user_id = $1::uuid
         AND (
           phone_number_hash = $2
           OR phone_number = ANY($3::text[])
         )
       LIMIT 1`,
      [user.id, phoneHash, variations]
    )

    if (phoneCheck.rows.length === 0) {
      console.log(
        `[GET-CALL-HISTORY] Verification failed: purchased number not found for user ${user.id}`
      )
      return NextResponse.json(
        {
          success: false,
          message: VERIFY_FAILED_MESSAGE,
          callLogs: [],
          count: 0
        },
        { headers: CORS_HEADERS }
      )
    }

    const userName =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"

    // 4) Count + call logs
    const [countResult, callLogsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM call_logs WHERE user_id = $1`, [user.id]),
      pool.query(
        `SELECT
          id,
          call_id,
          user_id,
          from_number,
          to_number,
          duration_seconds,
          status,
          cost_cents,
          created_at,
          updated_at,
          recording_url,
          transcript,
          summary,
          pathway_id,
          ended_reason,
          start_time,
          end_time,
          queue_time,
          latency_ms,
          interruptions,
          phone_number_id,
          country,
          state,
          city,
          zip_code,
          other_party_number,
          short_from,
          short_to,
          call_timestamp
        FROM call_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [user.id, limit, offset]
      )
    ])

    const total = parseInt(countResult.rows[0].total)
    const callLogs = callLogsResult.rows.map((row) => ({
      id: row.id,
      call_id: row.call_id,
      user_id: row.user_id,
      from_number: row.from_number,
      to_number: row.to_number,
      duration_seconds: row.duration_seconds,
      status: row.status,
      cost_cents: row.cost_cents ? parseInt(row.cost_cents) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      recording_url: row.recording_url,
      transcript: row.transcript,
      summary: row.summary,
      pathway_id: row.pathway_id,
      ended_reason: row.ended_reason,
      start_time: row.start_time,
      end_time: row.end_time,
      queue_time: row.queue_time,
      latency_ms: row.latency_ms,
      interruptions: row.interruptions,
      phone_number_id: row.phone_number_id,
      other_party_number: row.other_party_number,
      country: row.country,
      state: row.state,
      city: row.city,
      zip_code: row.zip_code,
      short_from: row.short_from,
      short_to: row.short_to,
      call_timestamp: row.call_timestamp
    }))

    console.log(`[GET-CALL-HISTORY] Found ${callLogs.length} call logs for user ${user.id}`)

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        email: userEmailDecrypted || normalizedEmail,
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
  } catch (error: any) {
    console.error("[GET-CALL-HISTORY] Error:", error)
    let message = "Internal server error"
    if (error?.message?.includes("relation") && error?.message?.includes("call_logs")) {
      message = 'Database table "call_logs" does not exist. Please run the migration script.'
    }

    return NextResponse.json(
      {
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && error?.message ? { error: error.message } : {})
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
