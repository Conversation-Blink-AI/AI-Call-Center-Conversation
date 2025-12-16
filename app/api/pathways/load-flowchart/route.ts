
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateAuthToken } from "@/lib/auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

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
    const phoneNumber = request.nextUrl.searchParams.get("phoneNumber")

    // Allow loading by pathwayId OR phoneNumber
    if (!pathwayId && !phoneNumber) {
      return NextResponse.json({ error: "Pathway ID or phone number is required" }, { status: 400 })
    }

    console.log(`[LOAD-FLOWCHART] Loading pathway ${pathwayId} for user ${userId}`)

    if (!process.env.DATABASE_URL) {
      console.error("[LOAD-FLOWCHART] ❌ DATABASE_URL not configured")
      return NextResponse.json({ 
        error: "Database not configured" 
      }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    try {
      await client.connect()
      console.log("[LOAD-FLOWCHART] ✅ Connected to database")

      let pathwayResult

      if (pathwayId) {
        // Load by pathway ID
        console.log(`[LOAD-FLOWCHART] Loading by pathway ID: ${pathwayId}`)
        pathwayResult = await client.query(`
          SELECT id, name, description, data, phone_id, created_at, updated_at
          FROM pathways
          WHERE id = $1 AND creator_id = $2
        `, [pathwayId, userId])
      } else if (phoneNumber) {
        // Load by phone number - find pathway via phone_id relationship
        console.log(`[LOAD-FLOWCHART] Loading by phone number: ${phoneNumber}`)
        const formattedPhone = phoneNumber.replace(/\D/g, '').startsWith('1') 
          ? `+${phoneNumber.replace(/\D/g, '')}` 
          : `+1${phoneNumber.replace(/\D/g, '')}`
        
        pathwayResult = await client.query(`
          SELECT p.id, p.name, p.description, p.data, p.phone_id, p.created_at, p.updated_at
          FROM pathways p
          JOIN phone_numbers pn ON p.phone_id = pn.id
          WHERE pn.phone_number = $1 AND pn.user_id = $2 AND p.creator_id = $2
        `, [formattedPhone, userId])
      } else {
        await client.end()
        return NextResponse.json({ error: "Pathway ID or phone number is required" }, { status: 400 })
      }

      if (pathwayResult.rows.length === 0) {
        console.log(`[LOAD-FLOWCHART] ⚠️ Pathway not found: ${pathwayId} for user ${userId}`)
        return NextResponse.json({ 
          error: "Pathway not found or not owned by user" 
        }, { status: 404 })
      }

      const pathway = pathwayResult.rows[0]

      console.log(`[LOAD-FLOWCHART] ✅ Successfully loaded pathway: ${pathway.name}`)
      console.log(`[LOAD-FLOWCHART] 📊 Data column type:`, typeof pathway.data)
      console.log(`[LOAD-FLOWCHART] 📊 Data column value:`, pathway.data ? 'Has data' : 'No data')

      // Parse the data if it's a string, otherwise use as-is
      let flowchartData = pathway.data
      if (typeof flowchartData === 'string') {
        try {
          flowchartData = JSON.parse(flowchartData)
        } catch (e) {
          console.error("[LOAD-FLOWCHART] ❌ Error parsing data JSON:", e)
          flowchartData = null
        }
      }

      return NextResponse.json({
        success: true,
        pathway: {
          id: pathway.id,
          name: pathway.name,
          description: pathway.description,
          phone_id: pathway.phone_id,
          flowchart_data: flowchartData, // Return the parsed data
          created_at: pathway.created_at,
          updated_at: pathway.updated_at
        }
      })
    } catch (dbError) {
      console.error("[LOAD-FLOWCHART] ❌ Database error:", dbError)
      throw dbError
    } finally {
      await client.end()
    }

  } catch (error) {
    console.error("[LOAD-FLOWCHART] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
