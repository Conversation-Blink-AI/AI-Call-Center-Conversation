import { NextRequest } from "next/server"
import { getPool } from "@/lib/db-client"
import { decryptString, hashPhoneNumber } from "@/lib/encryption"
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/lib/public-api-cors"
import { normalizeEmail } from "@/lib/utils"
import { CallDatabaseService } from "@/services/call-database-service"
import { toE164Format } from "@/utils/phone-utils"

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

async function verifyUserOwnsPhone(
  pool: ReturnType<typeof getPool>,
  userId: string,
  purchasedNumber: string,
): Promise<boolean> {
  const variations = collectPhoneVariations(purchasedNumber)

  const byNumber = await pool.query(
    `SELECT id FROM phone_numbers
     WHERE user_id = $1::uuid
       AND phone_number = ANY($2::text[])
     LIMIT 1`,
    [userId, variations],
  )
  if (byNumber.rows.length > 0) {
    return true
  }

  try {
    const phoneHash = hashPhoneNumber(purchasedNumber)
    const byHash = await pool.query(
      `SELECT id FROM phone_numbers
       WHERE user_id = $1::uuid
         AND phone_number_hash = $2
       LIMIT 1`,
      [userId, phoneHash],
    )
    return byHash.rows.length > 0
  } catch (error) {
    console.warn("[GET-CALL-HISTORY] phone_number_hash lookup skipped:", error)
    return false
  }
}

export async function OPTIONS() {
  return publicApiOptionsResponse()
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
      return publicApiJsonResponse(
        {
          success: false,
          message:
            "email, userId, and phoneNumber (purchased number from getPurchaseNumber) are all required",
        },
        400,
      )
    }

    if (!UUID_REGEX.test(userIdParam)) {
      return publicApiJsonResponse(
        { success: false, message: "userId must be a valid UUID" },
        400,
      )
    }

    if (!process.env.DATABASE_URL) {
      console.error("[GET-CALL-HISTORY] DATABASE_URL is not set")
      return publicApiJsonResponse(
        { success: false, message: "Database configuration error" },
        500,
      )
    }

    const normalizedEmail = normalizeEmail(emailParam)
    const pool = getPool()

    const userResult = await pool.query(
      `SELECT id, email, email_enc, first_name, last_name
       FROM users
       WHERE id = $1::uuid
       LIMIT 1`,
      [userIdParam],
    )

    if (userResult.rows.length === 0) {
      return publicApiJsonResponse({
        success: false,
        message: VERIFY_FAILED_MESSAGE,
        callLogs: [],
        count: 0,
      })
    }

    const user = userResult.rows[0]
    const userEmailDecrypted = decryptMaybe(user.email, user.email_enc)
    const normalizedStoredEmail = normalizeEmail(userEmailDecrypted)

    if (normalizedStoredEmail !== normalizedEmail) {
      return publicApiJsonResponse({
        success: false,
        message: VERIFY_FAILED_MESSAGE,
        callLogs: [],
        count: 0,
      })
    }

    const ownsPhone = await verifyUserOwnsPhone(pool, user.id, purchasedNumberParam)
    if (!ownsPhone) {
      return publicApiJsonResponse({
        success: false,
        message: VERIFY_FAILED_MESSAGE,
        callLogs: [],
        count: 0,
      })
    }

    const userName =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"

    const { calls, total } = await CallDatabaseService.getCallsForUser(user.id, {
      limit,
      offset,
    })

    const callLogs = calls.map((row) => ({
      id: row.id,
      call_id: row.call_id,
      user_id: row.user_id,
      from_number: row.from_number,
      to_number: row.to_number,
      duration_seconds: row.duration_seconds,
      status: row.status,
      cost_cents: row.cost_cents != null ? Number(row.cost_cents) : null,
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
      other_party_number: row.other_party_number ?? null,
      country: row.country ?? null,
      state: row.state ?? null,
      city: row.city ?? null,
      zip_code: row.zip_code ?? null,
      short_from: row.short_from ?? null,
      short_to: row.short_to ?? null,
      call_timestamp: row.call_timestamp ?? null,
    }))

    return publicApiJsonResponse({
      success: true,
      userId: user.id,
      email: userEmailDecrypted || normalizedEmail,
      user_name: userName,
      callLogs,
      count: callLogs.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: unknown) {
    console.error("[GET-CALL-HISTORY] Error:", error)
    const err = error as { message?: string }
    let message = "Internal server error"
    if (err?.message?.includes("relation") && err?.message?.includes("call_logs")) {
      message = 'Database table "call_logs" does not exist. Please run the migration script.'
    }

    return publicApiJsonResponse(
      {
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && err?.message
          ? { error: err.message }
          : {}),
      },
      500,
    )
  }
}
