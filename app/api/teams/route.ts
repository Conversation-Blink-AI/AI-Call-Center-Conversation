import { NextResponse } from "next/server"
import { Client } from "pg"
import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🔍 [TEAMS-API] Loading teams for user:', user.id)

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()

      // Get teams where user is owner or member
      const result = await client.query(`
        SELECT DISTINCT t.*, 
               CASE 
                 WHEN t.owner_id = $1 THEN 'owner'
                 ELSE tm.role 
               END as role,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) + 1 as member_count
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.owner_id = $1 OR tm.user_id = $1
        ORDER BY t.created_at DESC
      `, [user.id])

      console.log('✅ [TEAMS-API] Found teams:', result.rows.length)

      return NextResponse.json({
        success: true,
        teams: result.rows
      })

    } catch (dbError: any) {
      console.error("❌ [TEAMS-API] Database error:", dbError)

      // Handle UUID format errors
      if (dbError.message?.includes('invalid input syntax for type uuid')) {
        console.log('🔧 [TEAMS-API] UUID error detected')
        return NextResponse.json({
          success: false,
          error: "User authentication issue - please log in again",
          code: "AUTH_ID_FORMAT_ERROR"
        }, { status: 401 })
      }

      throw dbError
    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("❌ [TEAMS-API] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, ownerId } = body

    if (!name || !ownerId) {
      return NextResponse.json({ 
        success: false, 
        message: "Team name and owner ID are required" 
      }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()

      const result = await client.query(`
        INSERT INTO teams (name, description, owner_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [name, description, ownerId])

      const team = result.rows[0]

      console.log("✅ [TEAMS] Created team in PostgreSQL:", team.id)

      return NextResponse.json({
        success: true,
        team
      })
    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[TEAMS] POST Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}