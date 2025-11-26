
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateAuthToken } from "@/lib/auth-utils"
import { executeQuery } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { pathwayId, flowchartData } = body

    if (!pathwayId || !flowchartData) {
      return NextResponse.json({ 
        error: "Pathway ID and flowchart data are required" 
      }, { status: 400 })
    }

    console.log(`[SAVE-FLOWCHART] Saving pathway ${pathwayId} for user ${userId}`)

    // Update ONLY the flowchart_data - mirror the load logic approach
    const updateResult = await executeQuery(`
      UPDATE pathways 
      SET flowchart_data = $1, updated_at = NOW()
      WHERE pathway_id = $2 AND creator_id = $3
      RETURNING pathway_id, name, updated_at
    `, [JSON.stringify(flowchartData), pathwayId, userId])

    if (updateResult.length === 0) {
      return NextResponse.json({ 
        error: "Pathway not found or not owned by user" 
      }, { status: 404 })
    }

    const pathway = updateResult[0]

    console.log(`[SAVE-FLOWCHART] Successfully saved pathway: ${pathway.name}`)

    return NextResponse.json({
      success: true,
      pathway: {
        id: pathway.pathway_id,
        name: pathway.name,
        updated_at: pathway.updated_at
      }
    })

  } catch (error) {
    console.error("[SAVE-FLOWCHART] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
