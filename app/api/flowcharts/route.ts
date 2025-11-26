import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { Client } from "pg"

// Save/update a flowchart  
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phoneNumber, flowchartData, name, description } = await req.json()

    if (!phoneNumber || !flowchartData) {
      return NextResponse.json({ error: "Phone number and flowchart data are required" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    // Check if a flowchart already exists for this user + phone number
    const existingResult = await client.query(
      "SELECT id FROM pathways WHERE phone_number = $1 AND creator_id = $2",
      [phoneNumber, user.id]
    );

    const flowchartPayload = {
      name: name || "Bland.ai Pathway",
      description: description || `Flowchart for ${phoneNumber}`,
      phone_number: phoneNumber,
      creator_id: user.id,
      updater_id: user.id,
      data: flowchartData,
      updated_at: new Date().toISOString(),
    }

    if (existingResult.rows.length > 0) {
      // Update existing flowchart
      const { rows: updated } = await client.query(
        `UPDATE pathways
         SET name = $1, description = $2, data = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, name, description, phone_number, created_at, updated_at`,
        [flowchartPayload.name, flowchartPayload.description, JSON.stringify(flowchartPayload.data), existingResult.rows[0].id]
      );

      await client.end()

      return NextResponse.json({
        success: true,
        action: "updated",
        pathway: updated[0],
        message: `Flowchart for ${phoneNumber} updated successfully`,
      })
    } else {
      // Insert new flowchart
      const { rows: inserted } = await client.query(
        `INSERT INTO pathways (name, description, phone_number, creator_id, updater_id, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, name, description, phone_number, created_at, updated_at`,
        [flowchartPayload.name, flowchartPayload.description, flowchartPayload.phone_number, flowchartPayload.creator_id, flowchartPayload.updater_id, JSON.stringify(flowchartPayload.data)]
      );

      await client.end()

      return NextResponse.json({
        success: true,
        action: "created",
        pathway: inserted[0],
        message: `Flowchart for ${phoneNumber} created successfully`,
      })
    }
  } catch (error) {
    console.error("Error in flowchart save:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Get a flowchart by phone number
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const phoneNumber = searchParams.get("phoneNumber")

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()

    const { rows: pathway } = await client.query(
      "SELECT id, name, description, phone_number, data, created_at, updated_at FROM pathways WHERE phone_number = $1 AND creator_id = $2",
      [phoneNumber, user.id]
    );

    await client.end()

    if (pathway.length === 0) {
      return NextResponse.json({ error: "No flowchart found for this phone number" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      pathway: pathway[0],
    })
  } catch (error) {
    console.error("Error in flowchart fetch:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}