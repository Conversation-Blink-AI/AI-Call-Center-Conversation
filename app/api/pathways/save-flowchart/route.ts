
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateAuthToken } from "@/lib/auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

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

    // Update the data column (JSONB) in pathways table
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()
      
      const updateResult = await client.query(`
        UPDATE pathways 
        SET data = $1, updated_at = NOW()
        WHERE id = $2 AND creator_id = $3
        RETURNING id, name, updated_at
      `, [JSON.stringify(flowchartData), pathwayId, userId])

      if (updateResult.rows.length === 0) {
        await client.end()
        return NextResponse.json({ 
          error: "Pathway not found or not owned by user" 
        }, { status: 404 })
      }

      const pathway = updateResult.rows[0]

      console.log(`[SAVE-FLOWCHART] Successfully saved pathway: ${pathway.name}`)

      return NextResponse.json({
        success: true,
        pathway: {
          id: pathway.id,
          name: pathway.name,
          updated_at: pathway.updated_at
        }
      })
    } finally {
      await client.end()
    }


  } catch (error) {
    console.error("[SAVE-FLOWCHART] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
