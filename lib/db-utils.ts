import { Client } from "pg"
import { normalizeEmail } from "./utils"
import { getSSLConfig } from "./db-client"
import {
  encryptString,
  hashEmail,
  hashPhoneNumber,
  phoneLast4
} from "./encryption"
import { toE164Format } from "@/utils/phone-utils"
import type { BlandCallLogPayload } from "./bland-webhook-utils"
import type { LanderEventPayload } from "./lander-webhook-utils"

export async function connectToDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig()
  })

  await client.connect()
  return client
}

export async function executeQuery(query: string, params: any[] = []) {
  const client = await connectToDatabase()

  try {
    const result = await client.query(query, params)
    return result.rows
  } finally {
    await client.end()
  }
}

export async function getUserById(id: string) {
  return executeQuery(
    "SELECT id, email, name, company, role, phone_number, created_at, updated_at FROM users WHERE id = $1",
    [id]
  )
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const emailHash = hashEmail(normalizedEmail)
  return executeQuery(
    "SELECT * FROM users WHERE email_hash = $1 OR LOWER(email) = LOWER($2)",
    [emailHash, normalizedEmail]
  )
}

export async function createUser(userData: {
  email: string
  name: string
  company?: string
  role?: string
  phone_number?: string
  passwordHash: string
}) {
  const normalizedEmail = normalizeEmail(userData.email)
  const normalizedPhone = userData.phone_number ? toE164Format(userData.phone_number) : ""
  return executeQuery(`
    INSERT INTO users (
      email,
      email_enc,
      email_hash,
      name,
      company,
      role,
      phone_number,
      phone_number_enc,
      phone_number_hash,
      phone_number_last4,
      password_hash,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
    )
    RETURNING id, email, name, company, role, phone_number, created_at, updated_at
  `, [
    normalizedEmail,
    encryptString(normalizedEmail),
    hashEmail(normalizedEmail),
    userData.name,
    userData.company || null,
    userData.role || 'user',
    normalizedPhone || null,
    normalizedPhone ? encryptString(normalizedPhone) : null,
    normalizedPhone ? hashPhoneNumber(normalizedPhone) : null,
    normalizedPhone ? phoneLast4(normalizedPhone) : null,
    userData.passwordHash
  ])
}

export async function updateUser(id: string, userData: Partial<{
  name: string
  company: string
  role: string
  phone_number: string
  last_login: Date
}>) {
  const updates: string[] = []
  const values: any[] = []

  for (const [key, value] of Object.entries(userData)) {
    if (key === "phone_number") {
      const normalizedPhone = value ? toE164Format(String(value)) : ""
      updates.push("phone_number = $" + (values.length + 2))
      values.push(normalizedPhone || null)
      updates.push("phone_number_enc = $" + (values.length + 2))
      values.push(normalizedPhone ? encryptString(normalizedPhone) : null)
      updates.push("phone_number_hash = $" + (values.length + 2))
      values.push(normalizedPhone ? hashPhoneNumber(normalizedPhone) : null)
      updates.push("phone_number_last4 = $" + (values.length + 2))
      values.push(normalizedPhone ? phoneLast4(normalizedPhone) : null)
      continue
    }

    updates.push(`${key} = $${values.length + 2}`)
    values.push(value)
  }

  return executeQuery(`
    UPDATE users 
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, name, company, role, phone_number, created_at, updated_at
  `, [id, ...values])
}

export async function getPathwaysByUserId(userId: string) {
  return executeQuery(
    "SELECT * FROM pathways WHERE creator_id = $1 ORDER BY created_at DESC",
    [userId]
  )
}

export async function createPathway(pathwayData: {
  name: string
  description?: string
  creator_id: string
  phone_number_id?: string
  team_id?: string
}) {
  try {
    const result = await executeQuery(`
      INSERT INTO pathways (name, description, creator_id, phone_number_id, team_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [
      pathwayData.name,
      pathwayData.description || null,
      pathwayData.creator_id,
      pathwayData.phone_number_id || null,
      pathwayData.team_id || null
    ])

    return { data: result[0], error: null }
  } catch (error) {
    console.error("Error creating pathway:", error)
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getPathwayById(id: string) {
  const result = await executeQuery(
    "SELECT * FROM pathways WHERE id = $1",
    [id]
  )
  return result[0] || null
}

export async function updatePathway(id: string, pathwayData: Partial<{
  name: string
  description: string
  phone_number_id: string
  team_id: string
  flowchart_data: any
}>) {
  const updates = Object.keys(pathwayData).map((key, index) => `${key} = $${index + 2}`).join(', ')
  const values = Object.values(pathwayData)

  return executeQuery(`
    UPDATE pathways 
    SET ${updates}, updated_at = NOW()
    WHERE pathway_id = $1
    RETURNING *
  `, [id, ...values])
}

export async function deletePathway(id: string) {
  return executeQuery(
    "DELETE FROM pathways WHERE pathway_id = $1 RETURNING *",
    [id]
  )
}

export async function getPathwayByPhoneNumber(phoneNumber: string, userId: string) {
  return executeQuery(`
    SELECT p.* FROM pathways p
    JOIN phone_numbers pn ON p.phone_number_id = pn.id
    WHERE pn.phone_number = $1 AND p.creator_id = $2 
    ORDER BY p.updated_at DESC LIMIT 1
  `, [phoneNumber, userId])
}

// Call-related functions
export async function createCall(callData: {
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
  phone_number_id?: string
}) {
  const toNumber = callData.to_number ? toE164Format(callData.to_number) : ""
  const fromNumber = callData.from_number ? toE164Format(callData.from_number) : ""
  return executeQuery(`
    INSERT INTO call_logs (
      call_id, user_id, to_number, from_number,
      to_number_enc, to_number_hash, from_number_enc, from_number_hash,
      duration_seconds, status, recording_url, recording_url_enc,
      transcript, transcript_enc, summary, summary_enc, cost_cents, 
      pathway_id, ended_reason, phone_number_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
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
      cost_cents = COALESCE(EXCLUDED.cost_cents, call_logs.cost_cents),
      ended_reason = COALESCE(EXCLUDED.ended_reason, call_logs.ended_reason),
      updated_at = NOW()
    RETURNING *
  `, [
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
    callData.cost_cents || null,
    callData.pathway_id || null,
    callData.ended_reason || null,
    callData.phone_number_id || null
  ])
}

export async function getCallsByUserId(userId: string, limit: number = 50, offset: number = 0) {
  return executeQuery(`
    SELECT c.*, pn.phone_number as phone_number_detail
    FROM call_logs c
    LEFT JOIN phone_numbers pn ON c.phone_number_id = pn.id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset])
}

export async function getCallById(callId: string) {
  return executeQuery(`
    SELECT c.*, pn.phone_number as phone_number_detail
    FROM call_logs c
    LEFT JOIN phone_numbers pn ON c.phone_number_id = pn.id
    WHERE c.call_id = $1
  `, [callId])
}

export async function updateCall(callId: string, updateData: any) {
  const updates: string[] = []
  const values: any[] = []

  for (const [key, value] of Object.entries(updateData)) {
    if (key === "to_number" || key === "from_number") {
      const normalized = value ? toE164Format(String(value)) : ""
      updates.push(`${key} = $${values.length + 2}`)
      values.push(normalized || null)
      updates.push(`${key}_enc = $${values.length + 2}`)
      values.push(normalized ? encryptString(normalized) : null)
      updates.push(`${key}_hash = $${values.length + 2}`)
      values.push(normalized ? hashPhoneNumber(normalized) : null)
      continue
    }

    if (key === "recording_url" || key === "transcript" || key === "summary") {
      updates.push(`${key} = $${values.length + 2}`)
      values.push(value || null)
      updates.push(`${key}_enc = $${values.length + 2}`)
      values.push(value ? encryptString(String(value)) : null)
      continue
    }

    updates.push(`${key} = $${values.length + 2}`)
    values.push(value)
  }

  return executeQuery(`
    UPDATE call_logs 
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE call_id = $1
    RETURNING *
  `, [callId, ...values])
}

// Call log functions for webhook-based call logging
export async function createCallLog(callData: BlandCallLogPayload) {
  const toNumber = callData.to_number ? toE164Format(callData.to_number) : ""
  const fromNumber = callData.from_number ? toE164Format(callData.from_number) : ""
  const otherParty = callData.phone_number ? toE164Format(callData.phone_number) : ""
  const transferredTo = callData.transferred_to
    ? toE164Format(callData.transferred_to)
    : null

  return executeQuery(`
    INSERT INTO call_logs (
      call_id, user_id, to_number, from_number,
      to_number_enc, to_number_hash, from_number_enc, from_number_hash,
      duration_seconds, status, recording_url, recording_url_enc, transcript, transcript_enc, summary, summary_enc,
      pathway_id, ended_reason, start_time, end_time,
      queue_time, latency_ms, interruptions, phone_number_id,
      phone_number, phone_number_enc, phone_number_hash,
      country, state, city, zip, short_from, short_to,
      call_timezone, call_time_utc, call_local_time,
      transferred_to, transferred_at,
      record_enabled, completed,
      error_message, queue_status, pre_transfer_duration, post_transfer_duration,
      language, placement_group, region,
      transcripts_json, pathway_logs_json, raw_webhook_payload,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
      $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
      $45, $46, $47, $48, $49, $50,
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
      start_time = COALESCE(EXCLUDED.start_time, call_logs.start_time),
      end_time = COALESCE(EXCLUDED.end_time, call_logs.end_time),
      queue_time = COALESCE(EXCLUDED.queue_time, call_logs.queue_time),
      latency_ms = COALESCE(EXCLUDED.latency_ms, call_logs.latency_ms),
      interruptions = COALESCE(EXCLUDED.interruptions, call_logs.interruptions),
      phone_number = COALESCE(EXCLUDED.phone_number, call_logs.phone_number),
      phone_number_enc = COALESCE(EXCLUDED.phone_number_enc, call_logs.phone_number_enc),
      phone_number_hash = COALESCE(EXCLUDED.phone_number_hash, call_logs.phone_number_hash),
      country = COALESCE(EXCLUDED.country, call_logs.country),
      state = COALESCE(EXCLUDED.state, call_logs.state),
      city = COALESCE(EXCLUDED.city, call_logs.city),
      zip = COALESCE(EXCLUDED.zip, call_logs.zip),
      short_from = COALESCE(EXCLUDED.short_from, call_logs.short_from),
      short_to = COALESCE(EXCLUDED.short_to, call_logs.short_to),
      call_timezone = COALESCE(EXCLUDED.call_timezone, call_logs.call_timezone),
      call_time_utc = COALESCE(EXCLUDED.call_time_utc, call_logs.call_time_utc),
      call_local_time = COALESCE(EXCLUDED.call_local_time, call_logs.call_local_time),
      transferred_to = COALESCE(EXCLUDED.transferred_to, call_logs.transferred_to),
      transferred_at = COALESCE(EXCLUDED.transferred_at, call_logs.transferred_at),
      record_enabled = COALESCE(EXCLUDED.record_enabled, call_logs.record_enabled),
      completed = COALESCE(EXCLUDED.completed, call_logs.completed),
      error_message = COALESCE(EXCLUDED.error_message, call_logs.error_message),
      queue_status = COALESCE(EXCLUDED.queue_status, call_logs.queue_status),
      pre_transfer_duration = COALESCE(EXCLUDED.pre_transfer_duration, call_logs.pre_transfer_duration),
      post_transfer_duration = COALESCE(EXCLUDED.post_transfer_duration, call_logs.post_transfer_duration),
      language = COALESCE(EXCLUDED.language, call_logs.language),
      placement_group = COALESCE(EXCLUDED.placement_group, call_logs.placement_group),
      region = COALESCE(EXCLUDED.region, call_logs.region),
      transcripts_json = COALESCE(EXCLUDED.transcripts_json, call_logs.transcripts_json),
      pathway_logs_json = COALESCE(EXCLUDED.pathway_logs_json, call_logs.pathway_logs_json),
      raw_webhook_payload = COALESCE(EXCLUDED.raw_webhook_payload, call_logs.raw_webhook_payload),
      updated_at = NOW()
    RETURNING *
  `, [
    callData.call_id,
    callData.user_id,
    toNumber,
    fromNumber,
    toNumber ? encryptString(toNumber) : null,
    toNumber ? hashPhoneNumber(toNumber) : null,
    fromNumber ? encryptString(fromNumber) : null,
    fromNumber ? hashPhoneNumber(fromNumber) : null,
    callData.duration_seconds ?? null,
    callData.status ?? null,
    callData.recording_url ?? null,
    callData.recording_url ? encryptString(callData.recording_url) : null,
    callData.transcript ?? null,
    callData.transcript ? encryptString(callData.transcript) : null,
    callData.summary ?? null,
    callData.summary ? encryptString(callData.summary) : null,
    callData.pathway_id ?? null,
    callData.ended_reason ?? null,
    callData.start_time ?? null,
    callData.end_time ?? null,
    callData.queue_time ?? null,
    callData.latency_ms ?? null,
    callData.interruptions ?? null,
    callData.phone_number_id ?? null,
    otherParty || null,
    otherParty ? encryptString(otherParty) : null,
    otherParty ? hashPhoneNumber(otherParty) : null,
    callData.country ?? null,
    callData.state ?? null,
    callData.city ?? null,
    callData.zip ?? null,
    callData.short_from ?? null,
    callData.short_to ?? null,
    callData.call_timezone ?? null,
    callData.call_time_utc ?? null,
    callData.call_local_time ?? null,
    transferredTo,
    callData.transferred_at ?? null,
    callData.record_enabled ?? null,
    callData.completed ?? null,
    callData.error_message ?? null,
    callData.queue_status ?? null,
    callData.pre_transfer_duration ?? null,
    callData.post_transfer_duration ?? null,
    callData.language ?? null,
    callData.placement_group ?? null,
    callData.region ?? null,
    callData.transcripts_json ? JSON.stringify(callData.transcripts_json) : null,
    callData.pathway_logs_json ? JSON.stringify(callData.pathway_logs_json) : null,
    callData.raw_webhook_payload ? JSON.stringify(callData.raw_webhook_payload) : null,
  ])
}

export async function createLanderEvent(eventData: LanderEventPayload) {
  return executeQuery(`
    INSERT INTO lander_events (
      ad_id, ad_set_id, campaign_id, ad_name, ad_set_name, campaign_name,
      placement, site_source_name, fbclid, lander_url,
      user_agent, device, ip, os, browser, ip_confidence, risk_flags,
      city, network_provider, connection_type, network_type,
      country, region, isp, asn, click_time, raw_webhook_payload
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
    )
    RETURNING id, created_at
  `, [
    eventData.ad_id ?? null,
    eventData.ad_set_id ?? null,
    eventData.campaign_id ?? null,
    eventData.ad_name ?? null,
    eventData.ad_set_name ?? null,
    eventData.campaign_name ?? null,
    eventData.placement ?? null,
    eventData.site_source_name ?? null,
    eventData.fbclid ?? null,
    eventData.lander_url ?? null,
    eventData.user_agent ?? null,
    eventData.device ?? null,
    eventData.ip ?? null,
    eventData.os ?? null,
    eventData.browser ?? null,
    eventData.ip_confidence ?? null,
    eventData.risk_flags ?? null,
    eventData.city ?? null,
    eventData.network_provider ?? null,
    eventData.connection_type ?? null,
    eventData.network_type ?? null,
    eventData.country ?? null,
    eventData.region ?? null,
    eventData.isp ?? null,
    eventData.asn ?? null,
    eventData.click_time ?? null,
    eventData.raw_webhook_payload ? JSON.stringify(eventData.raw_webhook_payload) : null,
  ])
}

// Team management functions
export async function getTeamById(id: string) {
  const result = await executeQuery(
    "SELECT * FROM teams WHERE id = $1",
    [id]
  )
  return result[0] || null
}

export async function updateTeam(id: string, teamData: Partial<{
  name: string
  description: string
}>) {
  const updates = Object.keys(teamData).map((key, index) => `${key} = $${index + 2}`).join(', ')
  const values = Object.values(teamData)

  const result = await executeQuery(`
    UPDATE teams 
    SET ${updates}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, ...values])
  return result[0] || null
}

export async function deleteTeam(id: string) {
  const result = await executeQuery(
    "DELETE FROM teams WHERE id = $1 RETURNING *",
    [id]
  )
  return result[0] || null
}

export async function checkTeamPermission(teamId: string, userId: string, requiredRole: 'owner' | 'admin' | 'member' = 'member') {
  const team = await getTeamById(teamId)
  if (!team) return false

  // Owner has all permissions
  if (team.owner_id === userId) return true

  // Check team member role
  const members = await executeQuery(
    "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",
    [teamId, userId]
  )

  if (members.length === 0) return false

  const userRole = members[0].role
  const roleHierarchy = { member: 1, admin: 2, owner: 3 }
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole]
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: string) {
  const result = await executeQuery(`
    UPDATE team_members 
    SET role = $3, updated_at = NOW()
    WHERE team_id = $1 AND user_id = $2
    RETURNING *
  `, [teamId, userId, role])
  return result[0] || null
}

// Pathway permission functions
export async function canViewPathway(pathwayId: string, userId: string): Promise<boolean> {
  const pathway = await getPathwayById(pathwayId)
  if (!pathway) return false

  // Creator can always view
  if (pathway.creator_id === userId) return true

  // Check if user is team member
  if (pathway.team_id) {
    const members = await executeQuery(
      "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
      [pathway.team_id, userId]
    )
    if (members.length > 0) return true
  }

  return false
}

export async function canEditPathway(pathwayId: string, userId: string): Promise<boolean> {
  const pathway = await getPathwayById(pathwayId)
  if (!pathway) return false

  // Creator can always edit
  if (pathway.creator_id === userId) return true

  // Check if user is team admin/owner
  if (pathway.team_id) {
    const team = await getTeamById(pathway.team_id)
    if (team && team.owner_id === userId) return true

    const members = await executeQuery(
      "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 AND role IN ('admin', 'owner')",
      [pathway.team_id, userId]
    )
    if (members.length > 0) return true
  }

  return false
}

export async function getActivitiesByPathwayId(pathwayId: string) {
  return executeQuery(
    "SELECT * FROM activities WHERE pathway_id = $1 ORDER BY created_at DESC",
    [pathwayId]
  )
}

// Invitation functions
export async function getInvitationByToken(token: string) {
  const result = await executeQuery(
    "SELECT * FROM invitations WHERE token = $1 AND (expires_at IS NULL OR expires_at > NOW())",
    [token]
  )
  return result[0] || null
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    throw new Error("Invalid or expired invitation")
  }

  // Create team member
  await executeQuery(`
    INSERT INTO team_members (team_id, user_id, role, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    ON CONFLICT (team_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      updated_at = NOW()
  `, [invitation.team_id, userId, invitation.role])

  // Delete invitation
  await executeQuery(
    "DELETE FROM invitations WHERE token = $1",
    [token]
  )

  return { success: true }
}