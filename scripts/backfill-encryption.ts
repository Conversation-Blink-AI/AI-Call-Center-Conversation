import { Client } from "pg"
import { encryptString, hashEmail, hashPhoneNumber, phoneLast4 } from "@/lib/encryption"
import { normalizeEmail } from "@/lib/utils"
import { toE164Format } from "@/utils/phone-utils"
import { getSSLConfig } from "@/lib/db-client"

async function backfillUsers(client: Client) {
  const { rows } = await client.query(
    `SELECT id, email, phone_number
     FROM users
     WHERE (email IS NOT NULL AND (email_enc IS NULL OR email_hash IS NULL))
        OR (phone_number IS NOT NULL AND (phone_number_enc IS NULL OR phone_number_hash IS NULL OR phone_number_last4 IS NULL))`
  )

  for (const row of rows) {
    const normalizedEmail = row.email ? normalizeEmail(row.email) : ""
    const normalizedPhone = row.phone_number ? toE164Format(row.phone_number) : ""
    await client.query(
      `UPDATE users
       SET email_enc = $2,
           email_hash = $3,
           phone_number_enc = $4,
           phone_number_hash = $5,
           phone_number_last4 = $6
       WHERE id = $1`,
      [
        row.id,
        normalizedEmail ? encryptString(normalizedEmail) : null,
        normalizedEmail ? hashEmail(normalizedEmail) : null,
        normalizedPhone ? encryptString(normalizedPhone) : null,
        normalizedPhone ? hashPhoneNumber(normalizedPhone) : null,
        normalizedPhone ? phoneLast4(normalizedPhone) : null
      ]
    )
  }
}

async function backfillPhoneNumbers(client: Client) {
  const { rows } = await client.query(
    `SELECT id, phone_number
     FROM phone_numbers
     WHERE phone_number IS NOT NULL
       AND (phone_number_enc IS NULL OR phone_number_hash IS NULL OR phone_number_last4 IS NULL)`
  )

  for (const row of rows) {
    const normalizedPhone = toE164Format(row.phone_number)
    await client.query(
      `UPDATE phone_numbers
       SET phone_number_enc = $2,
           phone_number_hash = $3,
           phone_number_last4 = $4
       WHERE id = $1`,
      [
        row.id,
        encryptString(normalizedPhone),
        hashPhoneNumber(normalizedPhone),
        phoneLast4(normalizedPhone)
      ]
    )
  }
}

async function backfillCallLogs(client: Client) {
  const columnResult = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'call_logs'`
  )
  const columns = new Set(columnResult.rows.map((row) => row.column_name))
  const hasPhoneNumber = columns.has("phone_number")
  const hasOtherPartyNumber = columns.has("other_party_number")

  const selectColumns = [
    "id",
    "from_number",
    "to_number",
    "recording_url",
    "transcript",
    "summary",
  ]
  if (hasPhoneNumber) selectColumns.push("phone_number")
  if (hasOtherPartyNumber) selectColumns.push("other_party_number")

  const whereConditions = [
    "(from_number IS NOT NULL AND (from_number_enc IS NULL OR from_number_hash IS NULL))",
    "(to_number IS NOT NULL AND (to_number_enc IS NULL OR to_number_hash IS NULL))",
    "(recording_url IS NOT NULL AND recording_url_enc IS NULL)",
    "(transcript IS NOT NULL AND transcript_enc IS NULL)",
    "(summary IS NOT NULL AND summary_enc IS NULL)",
  ]
  if (hasPhoneNumber) {
    whereConditions.push("(phone_number IS NOT NULL AND (phone_number_enc IS NULL OR phone_number_hash IS NULL))")
  }
  if (hasOtherPartyNumber) {
    whereConditions.push("(other_party_number IS NOT NULL AND (other_party_number_enc IS NULL OR other_party_number_hash IS NULL))")
  }

  const { rows } = await client.query(
    `SELECT ${selectColumns.join(", ")}
     FROM call_logs
     WHERE ${whereConditions.join(" OR ")}`
  )

  for (const row of rows) {
    const normalizedFrom = row.from_number ? toE164Format(row.from_number) : ""
    const normalizedTo = row.to_number ? toE164Format(row.to_number) : ""
    const normalizedPhone = hasPhoneNumber && row.phone_number ? toE164Format(row.phone_number) : ""
    const normalizedOther = hasOtherPartyNumber && row.other_party_number ? toE164Format(row.other_party_number) : ""

    const updates: string[] = []
    const values: any[] = [row.id]
    let index = 2

    updates.push(`from_number_enc = $${index++}`)
    values.push(normalizedFrom ? encryptString(normalizedFrom) : null)
    updates.push(`from_number_hash = $${index++}`)
    values.push(normalizedFrom ? hashPhoneNumber(normalizedFrom) : null)
    updates.push(`to_number_enc = $${index++}`)
    values.push(normalizedTo ? encryptString(normalizedTo) : null)
    updates.push(`to_number_hash = $${index++}`)
    values.push(normalizedTo ? hashPhoneNumber(normalizedTo) : null)
    updates.push(`recording_url_enc = $${index++}`)
    values.push(row.recording_url ? encryptString(row.recording_url) : null)
    updates.push(`transcript_enc = $${index++}`)
    values.push(row.transcript ? encryptString(row.transcript) : null)
    updates.push(`summary_enc = $${index++}`)
    values.push(row.summary ? encryptString(row.summary) : null)

    if (hasPhoneNumber) {
      updates.push(`phone_number_enc = $${index++}`)
      values.push(normalizedPhone ? encryptString(normalizedPhone) : null)
      updates.push(`phone_number_hash = $${index++}`)
      values.push(normalizedPhone ? hashPhoneNumber(normalizedPhone) : null)
    }

    if (hasOtherPartyNumber) {
      updates.push(`other_party_number_enc = $${index++}`)
      values.push(normalizedOther ? encryptString(normalizedOther) : null)
      updates.push(`other_party_number_hash = $${index++}`)
      values.push(normalizedOther ? hashPhoneNumber(normalizedOther) : null)
    }

    await client.query(
      `UPDATE call_logs
       SET ${updates.join(", ")}
       WHERE id = $1`,
      values
    )
  }
}

async function backfillMetaConfigs(client: Client) {
  const { rows } = await client.query(
    `SELECT id, access_token
     FROM meta_capi_configs
     WHERE access_token IS NOT NULL AND access_token_enc IS NULL`
  )

  for (const row of rows) {
    await client.query(
      `UPDATE meta_capi_configs
       SET access_token_enc = $2
       WHERE id = $1`,
      [row.id, encryptString(row.access_token)]
    )
  }
}

async function backfillPayments(client: Client) {
  const { rows } = await client.query(
    `SELECT id, gateway_payment_id
     FROM payments
     WHERE gateway_payment_id IS NOT NULL AND gateway_payment_id_enc IS NULL`
  )

  for (const row of rows) {
    await client.query(
      `UPDATE payments
       SET gateway_payment_id_enc = $2
       WHERE id = $1`,
      [row.id, encryptString(row.gateway_payment_id)]
    )
  }
}

async function backfillAdminAuditLogs(client: Client) {
  const { rows } = await client.query(
    `SELECT id, old_value, new_value
     FROM admin_audit_logs
     WHERE (old_value IS NOT NULL AND old_value_enc IS NULL)
        OR (new_value IS NOT NULL AND new_value_enc IS NULL)`
  )

  for (const row of rows) {
    await client.query(
      `UPDATE admin_audit_logs
       SET old_value_enc = $2,
           new_value_enc = $3
       WHERE id = $1`,
      [
        row.id,
        row.old_value ? encryptString(JSON.stringify(row.old_value)) : null,
        row.new_value ? encryptString(JSON.stringify(row.new_value)) : null
      ]
    )
  }
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig()
  })

  await client.connect()
  try {
    await backfillUsers(client)
    await backfillPhoneNumbers(client)
    await backfillCallLogs(client)
    await backfillMetaConfigs(client)
    await backfillPayments(client)
    await backfillAdminAuditLogs(client)
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  console.error("Backfill failed:", error)
  process.exit(1)
})
