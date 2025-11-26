
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateAuthToken } from "@/lib/auth-utils"
import { executeQuery } from "@/lib/db-utils"

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the token
    const authResult = await validateAuthToken(token)
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = authResult.user.id
    const pathwayId = request.nextUrl.searchParams.get("pathwayId")

    if (!pathwayId) {
      return NextResponse.json({ error: "Pathway ID is required" }, { status: 400 })
    }

    console.log(`[LOAD-FLOWCHART] Loading pathway ${pathwayId} for user ${userId}`)

    // Get pathway data
    const pathwayResult = await executeQuery(`
      SELECT pathway_id, name, description, flowchart_data, phone_number_id, created_at, updated_at
      FROM pathways
      WHERE pathway_id = $1 AND creator_id = $2
    `, [pathwayId, userId])

    if (pathwayResult.length === 0) {
      return NextResponse.json({ 
        error: "Pathway not found or not owned by user" 
      }, { status: 404 })
    }

    const pathway = pathwayResult[0]

    console.log(`[LOAD-FLOWCHART] Successfully loaded pathway: ${pathway.name}`)

    return NextResponse.json({
      success: true,
      pathway: {
        id: pathway.pathway_id,
        name: pathway.name,
        description: pathway.description,
        phone_number_id: pathway.phone_number_id,
        flowchart_data: pathway.flowchart_data,
        created_at: pathway.created_at,
        updated_at: pathway.updated_at
      }
    })

  } catch (error) {
    console.error("[LOAD-FLOWCHART] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
