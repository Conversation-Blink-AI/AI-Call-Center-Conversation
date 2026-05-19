import { Client } from 'pg'
import { getSSLConfig } from './db-client'
import { encryptString, hashEmail, hashPhoneNumber, phoneLast4 } from './encryption'
import { normalizeEmail } from './utils'
import { toE164Format } from '@/utils/phone-utils'

// PostgreSQL client setup
function createPgClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig()
  })
}

// User management functions
export async function createUser(userData: {
  email: string
  password: string
  name?: string
  company?: string
  phoneNumber?: string
}) {
  const client = createPgClient()

  try {
    await client.connect()

    const normalizedEmail = normalizeEmail(userData.email)
    const normalizedPhone = userData.phoneNumber ? toE164Format(userData.phoneNumber) : ""

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email_hash = $1 OR email = $2',
      [hashEmail(normalizedEmail), normalizedEmail]
    )

    if (existingUser.rows.length > 0) {
      throw new Error("User already exists")
    }

    // Create new user
    const result = await client.query(
      `INSERT INTO users (
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
        password_hash
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        normalizedEmail,
        encryptString(normalizedEmail),
        hashEmail(normalizedEmail),
        userData.name || null,
        userData.company || null,
        'user',
        normalizedPhone || null,
        normalizedPhone ? encryptString(normalizedPhone) : null,
        normalizedPhone ? hashPhoneNumber(normalizedPhone) : null,
        normalizedPhone ? phoneLast4(normalizedPhone) : null,
        userData.password // Should be hashed before calling this function
      ]
    )

    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function getUserByEmail(email: string) {
  const client = createPgClient()

  try {
    await client.connect()
    const normalizedEmail = normalizeEmail(email)
    const emailHash = hashEmail(normalizedEmail)
    const result = await client.query(
      'SELECT * FROM users WHERE email_hash = $1 OR email = $2',
      [emailHash, normalizedEmail]
    )

    return result.rows[0] || null
  } finally {
    await client.end()
  }
}

export async function getUserById(userId: string) {
  const client = createPgClient()

  try {
    await client.connect()
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    )

    return result.rows[0] || null
  } finally {
    await client.end()
  }
}

export async function getAllUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    const result = await client.query('SELECT id, email, first_name, last_name, company, role, phone_number, created_at, updated_at FROM users ORDER BY created_at DESC')
    return result.rows
  } finally {
    await client.end()
  }
}

export async function getAllTeams() {
  const client = createPgClient()

  try {
    await client.connect()
    const result = await client.query(
      'SELECT * FROM teams ORDER BY created_at DESC'
    )

    return result.rows
  } finally {
    await client.end()
  }
}

export async function getAllPathways() {
  const client = createPgClient()

  try {
    await client.connect()
    const result = await client.query(
      'SELECT * FROM pathways ORDER BY created_at DESC'
    )

    return result.rows
  } finally {
    await client.end()
  }
}

export async function getUserPhoneNumbers(userId: string) {
  const client = createPgClient()

  try {
    await client.connect()
    const result = await client.query(
      'SELECT * FROM phone_numbers WHERE user_id = $1 ORDER BY purchased_at DESC',
      [userId]
    )

    return result.rows
  } finally {
    await client.end()
  }
}

export async function getDatabaseStats() {
  const client = createPgClient()

  try {
    await client.connect()

    const [usersCount, teamsCount, pathwaysCount, phoneNumbersCount] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM users'),
      client.query('SELECT COUNT(*) as count FROM teams'),
      client.query('SELECT COUNT(*) as count FROM pathways'),
      client.query('SELECT COUNT(*) as count FROM phone_numbers')
    ])

    return {
      totalUsers: parseInt(usersCount.rows[0].count),
      totalTeams: parseInt(teamsCount.rows[0].count),
      totalPathways: parseInt(pathwaysCount.rows[0].count),
      totalPhoneNumbers: parseInt(phoneNumbersCount.rows[0].count)
    }
  } finally {
    await client.end()
  }
}

// Pathway management functions
export async function savePathway(pathwayData: {
  id?: string
  name: string
  description?: string
  teamId: string
  creatorId: string
  phoneNumber?: string
  data: any
}) {
  const client = createPgClient()

  try {
    await client.connect()

    if (pathwayData.id) {
      // Update existing pathway
      const result = await client.query(
        `UPDATE pathways 
         SET name = $1, description = $2, data = $3, phone_number = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          pathwayData.name,
          pathwayData.description || null,
          JSON.stringify(pathwayData.data),
          pathwayData.phoneNumber || null,
          pathwayData.id
        ]
      )
      return result.rows[0]
    } else {
      // Create new pathway
      const result = await client.query(
        `INSERT INTO pathways (name, description, team_id, creator_id, data, phone_number)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          pathwayData.name,
          pathwayData.description || null,
          pathwayData.teamId,
          pathwayData.creatorId,
          JSON.stringify(pathwayData.data),
          pathwayData.phoneNumber || null
        ]
      )
      return result.rows[0]
    }
  } finally {
    await client.end()
  }
}

export async function getPathway(pathwayId: string) {
  const client = createPgClient()

  try {
    await client.connect()
    const result = await client.query(
      'SELECT * FROM pathways WHERE id = $1',
      [pathwayId]
    )

    return result.rows[0] || null
  } finally {
    await client.end()
  }
}

export async function getUserPathways(userId: string) {
  const client = createPgClient()

  try {
    await client.connect()
    const result = await client.query(
      'SELECT * FROM pathways WHERE creator_id = $1 ORDER BY created_at DESC',
      [userId]
    )

    return result.rows
  } finally {
    await client.end()
  }
}

export async function setUserContext(client: any, userId: string) {
  try {
    await client.query(`SET app.current_user_id = '${userId}'`)
    console.log("✅ [RLS] User context set for:", userId)
  } catch (error) {
    console.error("❌ [RLS] Failed to set user context:", error)
  }
}

// Alias functions for compatibility
export async function createUserRecord(userData: {
  email: string
  name?: string
  company?: string
  role?: string
  phone_number?: string
  passwordHash: string
}) {
  return createUser({
    email: userData.email,
    password: userData.passwordHash, // Assuming it's already hashed
    name: userData.name,
    company: userData.company,
    phoneNumber: userData.phone_number
  })
}

export async function updateUserRecord(userId: string, updates: {
  name?: string
  company?: string
  role?: string
  phone_number?: string
}) {
  const client = createPgClient()
  try {
    await client.connect()
    const setClauses = []
    const values = []
    let paramIndex = 1

    if (updates.name !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`)
      values.push(updates.name.split(' ')[0] || updates.name)
      setClauses.push(`last_name = $${paramIndex++}`)
      values.push(updates.name.split(' ').slice(1).join(' ') || '')
    }
    if (updates.company !== undefined) {
      setClauses.push(`company = $${paramIndex++}`)
      values.push(updates.company)
    }
    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramIndex++}`)
      values.push(updates.role)
    }
    if (updates.phone_number !== undefined) {
      const normalizedPhone = updates.phone_number ? toE164Format(updates.phone_number) : ""
      setClauses.push(`phone_number = $${paramIndex++}`)
      values.push(normalizedPhone || null)
      setClauses.push(`phone_number_enc = $${paramIndex++}`)
      values.push(normalizedPhone ? encryptString(normalizedPhone) : null)
      setClauses.push(`phone_number_hash = $${paramIndex++}`)
      values.push(normalizedPhone ? hashPhoneNumber(normalizedPhone) : null)
      setClauses.push(`phone_number_last4 = $${paramIndex++}`)
      values.push(normalizedPhone ? phoneLast4(normalizedPhone) : null)
    }

    if (setClauses.length === 0) {
      return await getUserById(userId)
    }

    setClauses.push(`updated_at = NOW()`)
    values.push(userId)

    const result = await client.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )
    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function createTeamRecord(teamData: {
  name: string
  description?: string
  owner_id: string
}) {
  const client = createPgClient()
  try {
    await client.connect()
    const result = await client.query(
      `INSERT INTO teams (name, description, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [
        teamData.name,
        teamData.description || null,
        teamData.owner_id
      ]
    )
    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function getTeamById(teamId: string) {
  const client = createPgClient()
  try {
    await client.connect()
    const result = await client.query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    )
    return result.rows[0] || null
  } finally {
    await client.end()
  }
}

export async function createPathwayRecord(pathwayData: {
  name: string
  description?: string
  team_id: string
  creator_id: string
  updater_id?: string
  data?: any
  phone_number?: string
}) {
  const client = createPgClient()
  try {
    await client.connect()
    const result = await client.query(
      `INSERT INTO pathways (name, description, team_id, creator_id, updater_id, data, phone_number, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        pathwayData.name,
        pathwayData.description || null,
        pathwayData.team_id,
        pathwayData.creator_id,
        pathwayData.updater_id || pathwayData.creator_id,
        pathwayData.data ? JSON.stringify(pathwayData.data) : null,
        pathwayData.phone_number || null
      ]
    )
    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function getPathwayById(pathwayId: string) {
  return getPathway(pathwayId)
}

export async function createTeamMemberRecord(memberData: {
  team_id: string
  user_id: string
  role: string
}) {
  const client = createPgClient()
  try {
    await client.connect()
    const result = await client.query(
      `INSERT INTO team_members (team_id, user_id, role, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (team_id, user_id) DO UPDATE SET
         role = EXCLUDED.role,
         updated_at = NOW()
       RETURNING *`,
      [
        memberData.team_id,
        memberData.user_id,
        memberData.role
      ]
    )
    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function createActivityRecord(activityData: {
  pathway_id: string
  name: string
  description?: string
  type?: string
  data?: any
}) {
  const client = createPgClient()
  try {
    await client.connect()
    const result = await client.query(
      `INSERT INTO activities (pathway_id, name, description, type, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [
        activityData.pathway_id,
        activityData.name,
        activityData.description || null,
        activityData.type || 'action',
        activityData.data ? JSON.stringify(activityData.data) : null
      ]
    )
    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function createInvitationRecord(invitationData: {
  team_id: string
  email: string
  role: string
  token: string
  inviter_id: string
  expires_at?: Date
}) {
  const client = createPgClient()
  try {
    await client.connect()
    const result = await client.query(
      `INSERT INTO invitations (team_id, email, role, token, inviter_id, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        invitationData.team_id,
        invitationData.email,
        invitationData.role,
        invitationData.token,
        invitationData.inviter_id,
        invitationData.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default
      ]
    )
    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function createPhoneNumberRecord(phoneData: {
  phone_number: string
  user_id: string
  location?: string
  type?: string
  status?: string
  pathway_id?: string
}) {
  const client = createPgClient()
  try {
    await client.connect()
    const normalizedPhone = phoneData.phone_number ? toE164Format(phoneData.phone_number) : ""
    const result = await client.query(
      `INSERT INTO phone_numbers (
        phone_number,
        phone_number_enc,
        phone_number_hash,
        phone_number_last4,
        user_id,
        location,
        type,
        status,
        pathway_id,
        purchased_at,
        created_at,
        updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
       ON CONFLICT (phone_number) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         location = EXCLUDED.location,
         type = EXCLUDED.type,
         status = EXCLUDED.status,
         pathway_id = EXCLUDED.pathway_id,
         phone_number_enc = EXCLUDED.phone_number_enc,
         phone_number_hash = EXCLUDED.phone_number_hash,
         phone_number_last4 = EXCLUDED.phone_number_last4,
         updated_at = NOW()
       RETURNING *`,
      [
        normalizedPhone,
        normalizedPhone ? encryptString(normalizedPhone) : null,
        normalizedPhone ? hashPhoneNumber(normalizedPhone) : null,
        normalizedPhone ? phoneLast4(normalizedPhone) : null,
        phoneData.user_id,
        phoneData.location || 'Unknown',
        phoneData.type || 'Local',
        phoneData.status || 'active',
        phoneData.pathway_id || null
      ]
    )
    return result.rows[0]
  } finally {
    await client.end()
  }
}

export async function initializeDatabase() {
  const client = createPgClient()
  try {
    await client.connect()
    // This function should create tables if they don't exist
    // For now, we'll just verify connection
    await client.query('SELECT 1')
    return { success: true }
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  } finally {
    await client.end()
  }
}

export async function clearDatabase() {
  const client = createPgClient()
  try {
    await client.connect()
    // Clear all tables (use with caution!)
    await client.query('TRUNCATE TABLE users, teams, pathways, team_members, activities, invitations, phone_numbers, calls, call_logs CASCADE')
    return { success: true }
  } catch (error) {
    console.error('Database clear error:', error)
    throw error
  } finally {
    await client.end()
  }
}