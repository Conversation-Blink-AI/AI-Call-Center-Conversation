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
    const { name, description, phoneNumber, flowchartData } = body

    if (!name?.trim() || !flowchartData) {
      return NextResponse.json({ 
        error: "Name and flowchart data are required" 
      }, { status: 400 })
    }

    console.log(`[CREATE-PATHWAY] Creating new pathway "${name}" for user ${userId}`)

    // Create new pathway
    const insertResult = await executeQuery(`
      INSERT INTO pathways (pathway_id, creator_id, name, description, phone_number_id, flowchart_data, created_at, updated_at)
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING pathway_id, name, created_at
    `, [userId, name.trim(), description?.trim() || null, phoneNumber || null, JSON.stringify(flowchartData)])

    if (insertResult.length === 0) {
      return NextResponse.json({ 
        error: "Failed to create pathway" 
      }, { status: 500 })
    }

    const pathway = insertResult[0]

    console.log(`[CREATE-PATHWAY] Successfully created pathway: ${pathway.name} (${pathway.pathway_id})`)

    return NextResponse.json({
      success: true,
      pathway: {
        id: pathway.pathway_id,
        name: pathway.name,
        created_at: pathway.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error("[CREATE-PATHWAY] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}