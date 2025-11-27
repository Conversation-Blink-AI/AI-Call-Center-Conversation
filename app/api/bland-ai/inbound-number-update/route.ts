import { NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [INBOUND-UPDATE] Starting inbound number update...")

    // Authenticate user
    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      console.log("🚨 [INBOUND-UPDATE] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = authResult.user
    console.log("✅ [INBOUND-UPDATE] User authenticated:", user.id)

    // Get the request body
    const body = await request.json()
    console.log("📋 [INBOUND-UPDATE] Request body:", JSON.stringify(body, null, 2))

    // Get the API key
    const apiKey = process.env.BLAND_AI_API_KEY || process.env.BLAND_API_KEY
    if (!apiKey) {
      console.error("🚨 [INBOUND-UPDATE] Bland.ai API key not configured")
      return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 500 })
    }

    // Validate required fields
    const { phone_number, prompt } = body
    if (!phone_number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Build the update data object with all supported Bland.ai parameters
    const updateData: any = {}

    // Required: prompt (unless pathway_id is provided)
    if (body.prompt) updateData.prompt = body.prompt
    if (body.pathway_id) updateData.pathway_id = body.pathway_id
    if (body.pathway_version !== undefined) updateData.pathway_version = body.pathway_version

    // Agent Parameters
    if (body.voice) updateData.voice = body.voice
    if (body.background_track) updateData.background_track = body.background_track
    if (body.first_sentence) updateData.first_sentence = body.first_sentence
    if (body.summary_prompt) updateData.summary_prompt = body.summary_prompt
    if (typeof body.block_interruptions === 'boolean') updateData.block_interruptions = body.block_interruptions
    if (body.interruption_threshold !== undefined) updateData.interruption_threshold = body.interruption_threshold
    if (body.model) updateData.model = body.model
    if (body.language) updateData.language = body.language

    // Request data and tools
    if (body.request_data) updateData.request_data = body.request_data
    if (body.tools && Array.isArray(body.tools)) updateData.tools = body.tools

    // Analysis and metadata
    if (body.analysis_schema) updateData.analysis_schema = body.analysis_schema
    if (body.metadata) updateData.metadata = body.metadata
    if (body.analysis_prompt) updateData.analysis_prompt = body.analysis_prompt

    // Recording
    if (typeof body.record === 'boolean') updateData.record = body.record

    // Citation schemas
    if (body.citation_schema_ids && Array.isArray(body.citation_schema_ids)) {
      updateData.citation_schema_ids = body.citation_schema_ids
    }

    // Encrypted key for BYOT (Bring Your Own Twilio)
    if (body.encrypted_key) updateData.encrypted_key = body.encrypted_key

    console.log("📞 [INBOUND-UPDATE] Final update data:", JSON.stringify(updateData, null, 2))

    // Format phone number - remove + or %2B prefix if present, Bland API handles it
    let formattedPhoneNumber = phone_number.replace(/^\+|^%2B/, '')

    // Call the Bland.ai API to update the inbound number
    const blandUrl = `https://api.bland.ai/v1/inbound/${encodeURIComponent(formattedPhoneNumber)}`
    console.log("🌐 [INBOUND-UPDATE] Calling Bland.ai API:", blandUrl)

    const response = await fetch(blandUrl, {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    })

    console.log("📡 [INBOUND-UPDATE] Bland.ai response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      console.error("❌ [INBOUND-UPDATE] Bland.ai API error:", errorData)
      return NextResponse.json(
        {
          error: "Failed to update inbound number with Bland.ai",
          details: errorData,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("✅ [INBOUND-UPDATE] Inbound number updated successfully:", data)

    return NextResponse.json({
      success: true,
      message: data.message || "Inbound number updated successfully",
      updates: data.updates || data,
      failed_updates: data.failed_updates || null
    })
  } catch (error) {
    console.error("❌ [INBOUND-UPDATE] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

