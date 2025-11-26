import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createPathway, getPathwaysByUserId } from "@/lib/db-utils"
import { validateAuthToken } from "@/lib/auth-utils"
import { Client } from "pg"
import { getUserFromRequest } from "@/lib/auth-utils"

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const creatorId = searchParams.get('creator_id')

    console.log('[PATHWAYS-API] 🔍 Getting pathways for creator:', creatorId)
    console.log('[PATHWAYS-API] 👤 Authenticated user:', user.id)

    // Validate UUID format if creatorId is provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (creatorId && !uuidRegex.test(creatorId)) {
      console.log('[PATHWAYS-API] ❌ Invalid UUID format for creator_id:', creatorId)
      return NextResponse.json({ error: "Invalid creator ID format" }, { status: 400 })
    }

    if (creatorId && creatorId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    try {
      // Get pathways for the authenticated user using their actual UUID
      const query = `
        SELECT 
          p.*,
          pn.phone_number,
          pn.pathway_id,
          CONCAT(u.first_name, ' ', u.last_name) as phone_display_name
        FROM pathways p
        LEFT JOIN phone_numbers pn ON p.phone_number_id = pn.id
        LEFT JOIN users u ON p.creator_id = u.id
        WHERE p.creator_id = $1 AND pn.pathway_id IS NOT NULL
        ORDER BY p.updated_at DESC
      `

      const result = await client.query(query, [user.id])
      console.log('[PATHWAYS-API] ✅ Found pathways:', result.rows.length)

      return NextResponse.json({ 
        pathways: result.rows,
        count: result.rows.length 
      })
    } finally {
      await client.end()
    }
  } catch (error) {
    console.error("Error fetching pathways:", error)

    // Check if it's a UUID validation error
    if (error instanceof Error && error.message.includes('invalid input syntax for type uuid')) {
      return NextResponse.json({ 
        error: "Invalid user ID format", 
        details: "User ID must be a valid UUID" 
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to fetch pathways" }, { status: 500 })
  }
}

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

    // Create new pathway
    const { data: pathway, error: pathwayError } = await createPathway({
      ...body,
      creator_id: authResult.user.id,
    })

    return NextResponse.json(pathway)
  } catch (error) {
    console.error("Error creating pathway:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}