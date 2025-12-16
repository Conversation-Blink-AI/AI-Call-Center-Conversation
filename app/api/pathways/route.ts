import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createPathway, getPathwaysByUserId } from "@/lib/db-utils"
import { validateAuthToken } from "@/lib/auth-utils"
import { Client } from "pg"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getSSLConfig } from "@/lib/db-client"

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

    if (!process.env.DATABASE_URL) {
      console.error("[PATHWAYS-API] ❌ DATABASE_URL not configured")
      return NextResponse.json({ 
        error: "Database not configured",
        details: "DATABASE_URL environment variable is missing"
      }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()
      console.log("[PATHWAYS-API] ✅ Connected to database")
      // Get pathways for the authenticated user
      // The relationship is: pathways.phone_id -> phone_numbers.id
      const query = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.creator_id,
          p.created_at,
          p.updated_at,
          p.data,
          p.bland_id,
          p.phone_id,
          pn.id as phone_number_table_id,
          pn.phone_number,
          pn.location,
          pn.type,
          pn.status
        FROM pathways p
        LEFT JOIN phone_numbers pn ON p.phone_id = pn.id
        WHERE p.creator_id = $1
        ORDER BY p.updated_at DESC
      `

      console.log('[PATHWAYS-API] 🔍 Executing query for user:', user.id)
      console.log('[PATHWAYS-API] 📝 Query:', query.replace(/\s+/g, ' ').trim())
      
      const result = await client.query(query, [user.id])
      console.log('[PATHWAYS-API] ✅ Found pathways:', result.rows.length)
      
      if (result.rows.length > 0) {
        console.log('[PATHWAYS-API] 📊 Sample pathway data:', JSON.stringify(result.rows[0], null, 2))
      } else {
        console.log('[PATHWAYS-API] ⚠️ No pathways found for user:', user.id)
      }

      return NextResponse.json({ 
        pathways: result.rows,
        count: result.rows.length 
      })
    } catch (dbError) {
      console.error('[PATHWAYS-API] ❌ Database error:', dbError)
      throw dbError
    } finally {
      await client.end()
    }
  } catch (error) {
    console.error("[PATHWAYS-API] ❌ Error fetching pathways:", error)

    // Check if it's a UUID validation error
    if (error instanceof Error && error.message.includes('invalid input syntax for type uuid')) {
      return NextResponse.json({ 
        error: "Invalid user ID format", 
        details: "User ID must be a valid UUID" 
      }, { status: 400 })
    }

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[PATHWAYS-API] ❌ Full error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json({ 
      error: "Failed to fetch pathways",
      details: errorMessage 
    }, { status: 500 })
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