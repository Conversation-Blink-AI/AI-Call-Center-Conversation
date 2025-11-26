
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("\n=== 🎵 BLAND.AI VOICE SAMPLE API DEBUG TRACE ===")

  try {
    // Get JWT token from cookies using custom auth system
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      console.log("❌ [AUTH] No auth token found")
      return NextResponse.json({ error: "Unauthorized - No token" }, { status: 401 })
    }

    // Verify JWT secret is configured
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.log("❌ [AUTH] JWT secret not configured")
      return NextResponse.json({ error: "JWT secret not properly configured. Please set JWT_SECRET in environment variables." }, { status: 500 })
    }

    let userId: string
    try {
      const decoded = jwt.verify(token, jwtSecret) as { userId: string }
      userId = decoded.userId
      console.log("✅ [AUTH] User authenticated:", userId)
    } catch (jwtError) {
      console.log("❌ [AUTH] Invalid token:", jwtError)
      return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 })
    }

    // Get API key from environment
    const blandApiKey = process.env.BLAND_AI_API_KEY
    if (!blandApiKey) {
      console.log("❌ [API KEY] Not configured")
      return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 500 })
    }

    console.log("✅ [API KEY] Configured")

    const voiceId = params.id
    console.log("🎤 [VOICE ID]", voiceId)

    // Parse request body to get custom text (optional)
    let requestData
    try {
      requestData = await request.json()
    } catch {
      requestData = {}
    }

    const sampleText = requestData.text || "Hey this is Hustle AI, can you hear me alright?"
    console.log("📝 [SAMPLE TEXT]", sampleText)

    // Make API request to Bland.ai
    console.log("🌐 [API REQUEST] Calling Bland.ai voice sample endpoint")
    const apiUrl = `https://api.bland.ai/v1/voices/${voiceId}/sample`

    const payload = {
      text: sampleText
    }

    console.log("📦 [PAYLOAD]", payload)

    const blandResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${blandApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("📡 [RESPONSE] Status:", blandResponse.status)
    console.log("📡 [RESPONSE] Content-Type:", blandResponse.headers.get("content-type"))

    // Handle non-OK responses
    if (!blandResponse.ok) {
      const errorText = await blandResponse.text()
      console.log("❌ [API ERROR]", errorText)
      return NextResponse.json(
        {
          error: `Bland.ai API error: ${blandResponse.status} ${blandResponse.statusText}`,
          details: errorText,
        },
        { status: blandResponse.status },
      )
    }

    // Check if response is audio
    const contentType = blandResponse.headers.get("content-type")
    if (contentType && contentType.includes("audio")) {
      console.log("🎵 [AUDIO] Received audio response")
      
      // Get the audio data as array buffer
      const audioBuffer = await blandResponse.arrayBuffer()
      
      // Return the audio data with proper headers
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": audioBuffer.byteLength.toString(),
        },
      })
    } else {
      // If not audio, try to parse as JSON
      const data = await blandResponse.json()
      console.log("📄 [JSON RESPONSE]", data)
      
      // Check if the response contains an audio URL
      if (data.audio_url) {
        console.log("🔗 [AUDIO URL]", data.audio_url)
        return NextResponse.json({ audio_url: data.audio_url })
      }
      
      return NextResponse.json(data)
    }

  } catch (error) {
    console.log("💥 [UNEXPECTED ERROR]", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  } finally {
    console.log("=== END DEBUG TRACE ===\n")
  }
}
