import { NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [SEND-CALL] Starting call request...")

    // Authenticate user
    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      console.log("🚨 [SEND-CALL] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = authResult.user
    console.log("✅ [SEND-CALL] User authenticated:", user.id)

    // Get the request body
    const body = await request.json()
    console.log("📋 [SEND-CALL] Request body:", JSON.stringify(body, null, 2))

    // Get the API key
    const apiKey = process.env.BLAND_AI_API_KEY
    if (!apiKey) {
      console.error("🚨 [SEND-CALL] Bland.ai API key not configured")
      return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 500 })
    }

    // Validate required fields
    const { phone_number } = body
    if (!phone_number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Check if either pathway_id or task is provided
    if (!body.pathway_id && !body.task) {
      return NextResponse.json({ error: "Either pathway_id or task must be provided" }, { status: 400 })
    }

    // Build the call data object with all supported Bland.ai parameters
    const callData: any = {
      phone_number: phone_number
    }

    // Basic parameters
    if (body.voice) callData.voice = body.voice
    if (body.pathway_id) callData.pathway_id = body.pathway_id
    if (body.pathway_version) callData.pathway_version = body.pathway_version
    if (body.task) callData.task = body.task
    if (body.first_sentence) callData.first_sentence = body.first_sentence
    if (body.persona_id) callData.persona_id = body.persona_id

    // Model settings
    if (body.model) callData.model = body.model
    if (body.language) callData.language = body.language
    if (typeof body.wait_for_greeting === 'boolean') callData.wait_for_greeting = body.wait_for_greeting
    if (body.temperature !== undefined) callData.temperature = body.temperature
    if (body.interruption_threshold !== undefined) callData.interruption_threshold = body.interruption_threshold

    // Pronunciation guide
    if (body.pronunciation_guide && Array.isArray(body.pronunciation_guide)) {
      callData.pronunciation_guide = body.pronunciation_guide
    }

    // Dispatch settings
    if (body.from) callData.from = body.from
    if (body.dialing_strategy) callData.dialing_strategy = body.dialing_strategy
    if (body.timezone) callData.timezone = body.timezone
    if (body.start_time) callData.start_time = body.start_time
    if (body.transfer_phone_number) callData.transfer_phone_number = body.transfer_phone_number
    if (body.transfer_list) callData.transfer_list = body.transfer_list
    if (body.max_duration !== undefined) callData.max_duration = body.max_duration

    // Knowledge and tools
    if (body.tools && Array.isArray(body.tools)) callData.tools = body.tools
    if (body.dynamic_data && Array.isArray(body.dynamic_data)) callData.dynamic_data = body.dynamic_data

    // Audio settings
    if (body.background_track) callData.background_track = body.background_track
    if (typeof body.noise_cancellation === 'boolean') callData.noise_cancellation = body.noise_cancellation
    if (typeof body.block_interruptions === 'boolean') callData.block_interruptions = body.block_interruptions
    if (typeof body.record === 'boolean') callData.record = body.record

    // Voicemail behavior
    if (body.voicemail) callData.voicemail = body.voicemail

    // Analysis and reporting
    if (body.citation_schema_ids && Array.isArray(body.citation_schema_ids)) {
      callData.citation_schema_ids = body.citation_schema_ids
    }
    if (body.summary_prompt) callData.summary_prompt = body.summary_prompt
    if (body.dispositions && Array.isArray(body.dispositions)) {
      callData.dispositions = body.dispositions
    }
    if (body.keywords && Array.isArray(body.keywords)) {
      callData.keywords = body.keywords
    }

    // Post-call actions
    if (body.retry) callData.retry = body.retry
    if (body.request_data) callData.request_data = body.request_data
    if (body.metadata) callData.metadata = body.metadata
    if (body.webhook) callData.webhook = body.webhook
    if (body.webhook_events && Array.isArray(body.webhook_events)) {
      callData.webhook_events = body.webhook_events
    }

    // Advanced options
    if (typeof body.ignore_button_press === 'boolean') callData.ignore_button_press = body.ignore_button_press
    if (body.precall_dtmf_sequence) callData.precall_dtmf_sequence = body.precall_dtmf_sequence

    console.log("📞 [SEND-CALL] Final call data:", JSON.stringify(callData, null, 2))

    // Call the Bland.ai API to initiate the call
    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(callData),
    })

    console.log("📡 [SEND-CALL] Bland.ai response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("❌ [SEND-CALL] Bland.ai API error:", errorData)
      return NextResponse.json(
        {
          error: "Failed to initiate call with Bland.ai",
          details: errorData,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("✅ [SEND-CALL] Call initiated successfully:", data)

    return NextResponse.json({
      success: true,
      callId: data.call_id || data.id,
      message: "Call initiated successfully",
      callData: callData
    })
  } catch (error) {
    console.error("❌ [SEND-CALL] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}