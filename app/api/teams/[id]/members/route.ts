
import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const result = await client.query(`
      SELECT u.id, u.name, u.email, u.role, tm.role as team_role, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC
    `, [teamId])

    await client.end()

    return NextResponse.json({ 
      success: true, 
      members: result.rows 
    })
  } catch (error) {
    console.error("Error fetching team members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id
    const { email, role = 'member' } = await request.json()

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    // Check if user is team owner
    const teamResult = await client.query(
      "SELECT owner_id FROM teams WHERE id = $1",
      [teamId]
    )

    if (teamResult.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    if (teamResult.rows[0].owner_id !== user.value.id) {
      await client.end()
      return NextResponse.json({ error: "Only team owners can add members" }, { status: 403 })
    }

    // Find user by email
    const userResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    )

    if (userResult.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const newUserId = userResult.rows[0].id

    // Add team member
    await client.query(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (team_id, user_id) DO NOTHING
    `, [teamId, newUserId, role])

    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: "Member added to team" 
    })
  } catch (error) {
    console.error("Error adding team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
