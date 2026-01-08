import { Client } from "pg"
import { normalizeEmail } from "./utils"
import { getSSLConfig } from "./db-client"

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
  return executeQuery(
    "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
    [normalizedEmail]
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
  return executeQuery(`
    INSERT INTO users (email, name, company, role, phone_number, password_hash, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id, email, name, company, role, phone_number, created_at, updated_at
  `, [
    normalizedEmail,
    userData.name,
    userData.company || null,
    userData.role || 'user',
    userData.phone_number || null,
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
  const updates = Object.keys(userData).map((key, index) => `${key} = $${index + 2}`).join(', ')
  const values = Object.values(userData)

  return executeQuery(`
    UPDATE users 
    SET ${updates}, updated_at = NOW()
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
  return executeQuery(`
    INSERT INTO call_logs (
      call_id, user_id, to_number, from_number, duration_seconds, 
      status, recording_url, transcript, summary, cost_cents, 
      pathway_id, ended_reason, phone_number_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
    ) 
    ON CONFLICT (call_id) 
    DO UPDATE SET
      duration_seconds = EXCLUDED.duration_seconds,
      status = EXCLUDED.status,
      recording_url = EXCLUDED.recording_url,
      transcript = EXCLUDED.transcript,
      summary = EXCLUDED.summary,
      cost_cents = EXCLUDED.cost_cents,
      ended_reason = EXCLUDED.ended_reason,
      updated_at = NOW()
    RETURNING *
  `, [
    callData.call_id,
    callData.user_id,
    callData.to_number,
    callData.from_number,
    callData.duration_seconds || null,
    callData.status || null,
    callData.recording_url || null,
    callData.transcript || null,
    callData.summary || null,
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
  const updates = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ')
  const values = Object.values(updateData)

  return executeQuery(`
    UPDATE call_logs 
    SET ${updates}, updated_at = NOW()
    WHERE call_id = $1
    RETURNING *
  `, [callId, ...values])
}

// Call log functions for webhook-based call logging
export async function createCallLog(callData: {
  call_id: string
  user_id: string
  to_number: string
  from_number: string
  duration_seconds?: number
  status?: string
  recording_url?: string
  transcript?: string
  summary?: string
  pathway_id?: string
  ended_reason?: string
  start_time?: string
  end_time?: string
  queue_time?: number
  latency_ms?: number
  interruptions?: number
  phone_number_id?: string
  // Bland.ai built-in variables
  phone_number?: string // The other party's number
  country?: string
  state?: string
  city?: string
  zip?: string
  short_from?: string
  short_to?: string
  call_timezone?: string
  call_time_utc?: string
}) {
  return executeQuery(`
    INSERT INTO call_logs (
      call_id, user_id, to_number, from_number, duration_seconds, 
      status, recording_url, transcript, summary, 
      pathway_id, ended_reason, start_time, end_time,
      queue_time, latency_ms, interruptions, phone_number_id,
      phone_number, country, state, city, zip, short_from, short_to,
      call_timezone, call_time_utc,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24, $25, $26,
      NOW(), NOW()
    ) 
    ON CONFLICT (call_id) 
    DO UPDATE SET
      duration_seconds = EXCLUDED.duration_seconds,
      status = EXCLUDED.status,
      recording_url = EXCLUDED.recording_url,
      transcript = EXCLUDED.transcript,
      summary = EXCLUDED.summary,
      ended_reason = EXCLUDED.ended_reason,
      end_time = EXCLUDED.end_time,
      queue_time = EXCLUDED.queue_time,
      latency_ms = EXCLUDED.latency_ms,
      interruptions = EXCLUDED.interruptions,
      phone_number = EXCLUDED.phone_number,
      country = EXCLUDED.country,
      state = EXCLUDED.state,
      city = EXCLUDED.city,
      zip = EXCLUDED.zip,
      short_from = EXCLUDED.short_from,
      short_to = EXCLUDED.short_to,
      call_timezone = EXCLUDED.call_timezone,
      call_time_utc = EXCLUDED.call_time_utc,
      updated_at = NOW()
    RETURNING *
  `, [
    callData.call_id,
    callData.user_id,
    callData.to_number,
    callData.from_number,
    callData.duration_seconds || null,
    callData.status || null,
    callData.recording_url || null,
    callData.transcript || null,
    callData.summary || null,
    callData.pathway_id || null,
    callData.ended_reason || null,
    callData.start_time || null,
    callData.end_time || null,
    callData.queue_time || null,
    callData.latency_ms || null,
    callData.interruptions || null,
    callData.phone_number_id || null,
    callData.phone_number || null,
    callData.country || null,
    callData.state || null,
    callData.city || null,
    callData.zip || null,
    callData.short_from || null,
    callData.short_to || null,
    callData.call_timezone || null,
    callData.call_time_utc || null
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