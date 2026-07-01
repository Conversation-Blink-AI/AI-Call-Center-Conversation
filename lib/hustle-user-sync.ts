import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { normalizeEmail } from "@/lib/utils"
import { encryptString, hashEmail, hashPhoneNumber, phoneLast4 } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"
import { buildHustleAuthContext, type HustleTokenPayload } from "@/lib/hustle-token"
import { syncForexOrgMemberships } from "@/lib/forex-org-sync"
import type { ForexAuthFields } from "@/lib/forex-permissions"

export interface HustleUserSyncResult {
  user: Record<string, unknown>
  forexAuthFields: ForexAuthFields
}

export async function syncUserFromHustleToken(
  token: string,
  decoded: HustleTokenPayload & Record<string, unknown>,
): Promise<HustleUserSyncResult> {
  const userEmail = decoded.email as string
  const externalId = (decoded.id || decoded._id) as string
  const normalizedEmail = normalizeEmail(userEmail)
  const normalizedPhone = decoded.phoneNumber || decoded.phone_number
    ? toE164Format(String(decoded.phoneNumber || decoded.phone_number))
    : ""
  const forexAuthFields = buildHustleAuthContext(decoded, decoded.role || "client")
  const emailEnc = encryptString(normalizedEmail)
  const emailHash = hashEmail(normalizedEmail)
  const phoneEnc = normalizedPhone ? encryptString(normalizedPhone) : null
  const phoneHash = normalizedPhone ? hashPhoneNumber(normalizedPhone) : null
  const phoneLast = normalizedPhone ? phoneLast4(normalizedPhone) : null

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
  })

  let user: Record<string, unknown>

  try {
    await client.connect()

    let result = await client.query(
      "SELECT * FROM users WHERE email_hash = $1::text OR email = $2::text",
      [emailHash, normalizedEmail],
    )

    if (result.rows.length === 0) {
      console.log("[HUSTLE-SIGNIN] Creating new user:", userEmail)

      result = await client.query(
        `INSERT INTO users (
            email,
            email_enc,
            email_hash,
            first_name,
            last_name,
            company,
            phone_number,
            phone_number_enc,
            phone_number_hash,
            phone_number_last4,
            role,
            external_id,
            external_token,
            is_verified,
            platform,
            created_at,
            updated_at,
            last_login
          ) VALUES (
            $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text,
            $8::text, $9::text, $10::text, $11::text, $12::text, $13::text, $14::boolean,
            $15::text, NOW(), NOW(), NOW()
          )
          RETURNING *`,
        [
          normalizedEmail,
          emailEnc,
          emailHash,
          decoded.firstName || decoded.first_name || "User",
          decoded.lastName || decoded.last_name || "",
          decoded.company || "",
          normalizedPhone || null,
          phoneEnc,
          phoneHash,
          phoneLast,
          decoded.role || "client",
          externalId,
          token,
          decoded.verified ?? false,
          decoded.platform || "AI Call",
        ],
      )
    } else {
      console.log("[HUSTLE-SIGNIN] Updating existing user:", userEmail)

      result = await client.query(
        `UPDATE users SET
            first_name = $1::text,
            last_name = $2::text,
            company = $3::text,
            phone_number = $4::text,
            phone_number_enc = $5::text,
            phone_number_hash = $6::text,
            phone_number_last4 = $7::text,
            role = $8::text,
            external_id = $9::text,
            external_token = $10::text,
            is_verified = $11::boolean,
            updated_at = NOW(),
            last_login = NOW()
          WHERE email_hash = $12::text OR email = $13::text
          RETURNING *`,
        [
          decoded.firstName || decoded.first_name || "User",
          decoded.lastName || decoded.last_name || "",
          decoded.company || "",
          normalizedPhone || null,
          phoneEnc,
          phoneHash,
          phoneLast,
          decoded.role || "client",
          externalId,
          token,
          decoded.verified ?? false,
          emailHash,
          normalizedEmail,
        ],
      )
    }

    user = result.rows[0]
    console.log("[HUSTLE-SIGNIN] User synced:", user.email)

    try {
      const walletCheck = await client.query("SELECT id FROM wallets WHERE user_id = $1", [user.id])
      if (walletCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO wallets (user_id, balance_cents, updated_at) VALUES ($1, 0, NOW())`,
          [user.id],
        )
        console.log("[HUSTLE-SIGNIN] Created wallet for user:", user.id)
      }
    } catch (walletError) {
      console.error("[HUSTLE-SIGNIN] Failed to ensure wallet for user:", walletError)
    }

    if (user?.id) {
      await syncForexOrgMemberships(client, String(user.id), decoded)
    }
  } finally {
    await client.end()
  }

  return { user, forexAuthFields }
}
