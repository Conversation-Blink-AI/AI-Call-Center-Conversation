
import { type NextRequest, NextResponse } from "next/server"
import { getSSLConfig } from "@/lib/db-client"

export async function POST(request: NextRequest) {
  try {
    const { pathwayId, name, description, nodes, edges } = await request.json()

    console.log("=".repeat(80))
    console.log("[API_ROUTE_NEW] 🚀 UPDATE PATHWAY NEW API ROUTE - PAYLOAD INSPECTION")
    console.log("=".repeat(80))

    // Get API key from environment
    const apiKey = process.env.BLAND_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ status: "error", message: "Bland.ai API key not configured in environment" }, { status: 500 })
    }

    if (!pathwayId) {
      return NextResponse.json({ status: "error", message: "Pathway ID is required" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ status: "error", message: "Pathway name is required" }, { status: 400 })
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json({ status: "error", message: "Invalid nodes or edges data" }, { status: 400 })
    }

    console.log("[API_ROUTE_NEW] 📋 Received payload structure:")
    console.log("[API_ROUTE_NEW] - API Key from environment, length:", apiKey.length)
    console.log("[API_ROUTE_NEW] - Pathway ID:", pathwayId)
    console.log("[API_ROUTE_NEW] - Name:", name)
    console.log("[API_ROUTE_NEW] - Description:", description || "No description provided")
    console.log("[API_ROUTE_NEW] - Nodes count:", nodes.length)
    console.log("[API_ROUTE_NEW] - Edges count:", edges.length)

    // Create the exact payload for Bland.ai
    const blandApiPayload = {
      name,
      description: description || `Updated on ${new Date().toISOString()}`,
      nodes,
      edges,
    }

    console.log("[API_ROUTE_NEW] 📤 Final payload to Bland.ai:")
    console.log("[API_ROUTE_NEW] - Payload keys:", Object.keys(blandApiPayload))

    // Test JSON serialization
    let serializedPayload: string
    try {
      serializedPayload = JSON.stringify(blandApiPayload)
      console.log("[API_ROUTE_NEW] ✅ JSON serialization successful")
      console.log("[API_ROUTE_NEW] - Serialized length:", serializedPayload.length)
    } catch (serializationError) {
      console.error("[API_ROUTE_NEW] ❌ JSON serialization failed:", serializationError)
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to serialize payload for Bland.ai",
        },
        { status: 500 },
      )
    }

    // Log the exact payload being sent (first 1000 chars for debugging)
    console.log("[API_ROUTE_NEW] 📋 Exact payload being sent to Bland.ai (first 1000 chars):")
    console.log(serializedPayload.substring(0, 1000))

    // Construct the API URL
    const apiUrl = `https://api.bland.ai/v1/pathway/${pathwayId}`
    console.log("[API_ROUTE_NEW] 🌐 API URL:", apiUrl)

    // Make the request to Bland.ai
    console.log("[API_ROUTE_NEW] 📡 Making request to Bland.ai...")
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: serializedPayload,
    })

    console.log("[API_ROUTE_NEW] 📥 Bland.ai response:")
    console.log("[API_ROUTE_NEW] - Status:", response.status)
    console.log("[API_ROUTE_NEW] - Status text:", response.statusText)
    console.log("[API_ROUTE_NEW] - OK:", response.ok)

    // Check content type before parsing
    const contentType = response.headers.get("content-type")
    console.log("[API_ROUTE_NEW] - Content type:", contentType)

    if (!contentType || !contentType.includes("application/json")) {
      const rawResponse = await response.text()
      console.error("[API_ROUTE_NEW] ❌ Non-JSON response from Bland.ai:", rawResponse.substring(0, 1000))
      return NextResponse.json(
        {
          status: "error",
          message: "Non-JSON response received from Bland.ai",
          responseStatus: response.status,
          responseStatusText: response.statusText,
          rawResponse: rawResponse.substring(0, 1000),
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[API_ROUTE_NEW] 📄 Bland.ai response data:", data)

    if (!response.ok) {
      console.error("[API_ROUTE_NEW] ❌ Bland.ai API error:")
      console.error("[API_ROUTE_NEW] - Status:", response.status)
      console.error("[API_ROUTE_NEW] - Data:", data)
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to update pathway on Bland.ai",
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseData: data,
        },
        { status: response.status },
      )
    }

    console.log("[API_ROUTE_NEW] ✅ Successfully updated pathway on Bland.ai")
    
    // Also save the flowchart data to the local database
    try {
      const { Client } = await import('pg')
      const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

      await client.connect()

      // Prepare the flowchart data to save
      const flowchartData = {
        name,
        description: description || `Updated on ${new Date().toISOString()}`,
        nodes,
        edges
      }

      // Update the pathways.data column in the database
      const dbUpdateResult = await client.query(`
        UPDATE pathways 
        SET data = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, updated_at
      `, [JSON.stringify(flowchartData), pathwayId])

      await client.end()

      if (dbUpdateResult.rows.length > 0) {
        console.log("[API_ROUTE_NEW] ✅ Successfully saved flowchart data to database")
      } else {
        console.log("[API_ROUTE_NEW] ⚠️ Pathway not found in database, but Bland.ai update succeeded")
      }
    } catch (dbError) {
      console.error("[API_ROUTE_NEW] ⚠️ Error saving to database (Bland.ai update succeeded):", dbError)
      // Don't fail the request if database save fails, since Bland.ai update succeeded
    }

    console.log("=".repeat(80))

    return NextResponse.json({
      status: "success",
      message: "Pathway updated successfully",
      data,
    })
  } catch (error) {
    console.error("=".repeat(80))
    console.error("[API_ROUTE_NEW] ❌ Unexpected error:", error)
    console.error("=".repeat(80))
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        error: error instanceof Error ? error.toString() : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
