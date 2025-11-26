import { Client } from "pg"

// Helper function to get SSL config for DigitalOcean
function getSSLConfig() {
  const dbUrl = process.env.DATABASE_URL || ""
  // Check if connecting to DigitalOcean (by IP or hostname)
  if (dbUrl.includes("ondigitalocean.com") || dbUrl.includes("157.245.104.224")) {
    // DigitalOcean uses self-signed certificates, so we need to allow them
    return { rejectUnauthorized: false }
  }
  return undefined // Use default SSL settings for other databases
}

export async function connectToDatabase() {
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
  return executeQuery(
    "SELECT * FROM users WHERE email = $1",
    [email]
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
  return executeQuery(`
    INSERT INTO users (email, name, company, role, phone_number, password_hash, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id, email, name, company, role, phone_number, created_at, updated_at
  `, [
    userData.email,
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
  return executeQuery(
    "SELECT * FROM pathways WHERE pathway_id = $1",
    [id]
  )
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
    INSERT INTO calls (
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
    FROM calls c
    LEFT JOIN phone_numbers pn ON c.phone_number_id = pn.id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset])
}

export async function getCallById(callId: string) {
  return executeQuery(`
    SELECT c.*, pn.phone_number as phone_number_detail
    FROM calls c
    LEFT JOIN phone_numbers pn ON c.phone_number_id = pn.id
    WHERE c.call_id = $1
  `, [callId])
}

export async function updateCall(callId: string, updateData: any) {
  const updates = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ')
  const values = Object.values(updateData)

  return executeQuery(`
    UPDATE calls 
    SET ${updates}, updated_at = NOW()
    WHERE call_id = $1
    RETURNING *
  `, [callId, ...values])
}