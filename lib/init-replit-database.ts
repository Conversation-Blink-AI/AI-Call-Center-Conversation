import { Client } from 'pg'

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

// PostgreSQL client setup
function createPgClient() {
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

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [userData.email]
    )

    if (existingUser.rows.length > 0) {
      throw new Error("User already exists")
    }

    // Create new user
    const result = await client.query(
      `INSERT INTO users (email, name, company, role, phone_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userData.email,
        userData.name || null,
        userData.company || null,
        'user',
        userData.phoneNumber || null,
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
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
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