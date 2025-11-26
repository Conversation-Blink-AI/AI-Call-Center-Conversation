import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { checkTeamPermission, updateTeamMemberRole, removeTeamMember } from "@/lib/db-utils"
import { supabase } from "@/lib/supabase"
import { Client } from "pg"

// Update a team member's role
export async function PUT(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id
    const memberId = params.userId
    const { role } = await req.json()

    // Check if user is the owner or admin
    const hasAccess = await checkTeamPermission(teamId, user.id, ["admin"])
    if (!hasAccess) {
      return NextResponse.json({ error: "You don't have permission to update member roles" }, { status: 403 })
    }

    // Get the team to check if the user being updated is the owner
    const { data: team, error: teamError } = await supabase.from("teams").select("owner_id").eq("id", teamId).single()

    if (teamError) {
      console.error("Error fetching team:", teamError)
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Cannot change the role of the team owner
    if (team.owner_id === memberId) {
      return NextResponse.json({ error: "Cannot change the role of the team owner" }, { status: 400 })
    }

    await updateTeamMemberRole(teamId, memberId, role)

    // Get the updated member
    const { data: member, error } = await supabase
      .from("team_members")
      .select(`
        *,
        user:user_id(id, name, email)
      `)
      .eq("team_id", teamId)
      .eq("user_id", memberId)
      .single()

    if (error) {
      console.error("Error fetching updated member:", error)
      return NextResponse.json({ error: "Failed to fetch updated member" }, { status: 500 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error("Error updating team member:", error)
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const user = await getUserFromRequest()
    if (!user.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id
    const userId = params.userId

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
      return NextResponse.json({ error: "Only team owners can remove members" }, { status: 403 })
    }

    // Remove team member
    await client.query(
      "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, userId]
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: "Member removed from team"
    })
  } catch (error) {
    console.error("Error removing team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}