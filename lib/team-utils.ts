
import { Client } from "pg"
import { getUserFromRequest } from "./auth-utils"

export async function getUserTeams() {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      throw new Error("User not authenticated")
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    // Get teams where user is owner or member
    const result = await client.query(`
      SELECT DISTINCT t.*, u.name as owner_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.owner_id = $1 OR tm.user_id = $1
      ORDER BY t.created_at DESC
    `, [user.value.id])

    await client.end()

    return result.rows
  } catch (error) {
    console.error("Error fetching user teams:", error)
    throw error
  }
}

export async function getTeamById(teamId: string) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      throw new Error("User not authenticated")
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(`
      SELECT t.*, u.name as owner_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.id = $1 AND (t.owner_id = $2 OR tm.user_id = $2)
    `, [teamId, user.value.id])

    await client.end()

    if (result.rows.length === 0) {
      throw new Error("Team not found or access denied")
    }

    return result.rows[0]
  } catch (error) {
    console.error("Error fetching team:", error)
    throw error
  }
}

export async function createTeam(teamData: {
  name: string
  description?: string
}) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      throw new Error("User not authenticated")
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(`
      INSERT INTO teams (name, description, owner_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `, [teamData.name, teamData.description || null, user.value.id])

    await client.end()

    return result.rows[0]
  } catch (error) {
    console.error("Error creating team:", error)
    throw error
  }
}
