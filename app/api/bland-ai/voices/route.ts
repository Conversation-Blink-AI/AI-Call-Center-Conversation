
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

interface BlandVoice {
  id: string
  name: string
  description: string
  public: boolean
  tags: string[]
}

interface BlandVoicesResponse {
  voices: BlandVoice[]
}

export async function GET(request: NextRequest) {
  console.log("\n=== 🎤 BLAND.AI VOICES API DEBUG TRACE ===")

  try {
    // Get JWT token from cookies using custom auth system
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      console.log("❌ [AUTH] No auth token found")
      return NextResponse.json({ error: "Unauthorized - No token" }, { status: 401 })
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.log("❌ [AUTH] JWT secret not configured")
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

    // Make API request to Bland.ai
    console.log("🌐 [API REQUEST] Calling Bland.ai voices endpoint")
    const apiUrl = "https://api.bland.ai/v1/voices"

    const blandResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${blandApiKey}`,
        "Content-Type": "application/json",
      },
    })

    console.log("📡 [RESPONSE] Status:", blandResponse.status)

    const rawResponseText = await blandResponse.text()
    console.log("📄 [RAW RESPONSE] First 200 chars:", rawResponseText.substring(0, 200))

    // Handle non-OK responses
    if (!blandResponse.ok) {
      console.log("❌ [API ERROR] Non-OK response")
      return NextResponse.json(
        {
          error: `Bland.ai API error: ${blandResponse.status} ${blandResponse.statusText}`,
          details: rawResponseText,
        },
        { status: blandResponse.status },
      )
    }

    // Parse JSON response
    let blandData: BlandVoicesResponse
    try {
      blandData = JSON.parse(rawResponseText)
      console.log("✅ [JSON PARSE] Success - Found", blandData.voices?.length || 0, "voices")
    } catch (jsonError) {
      console.log("❌ [JSON PARSE] Failed:", jsonError)
      return NextResponse.json(
        {
          error: "Invalid JSON response from Bland.ai",
          details: rawResponseText,
        },
        { status: 500 },
      )
    }

    // Filter and sort voices by rating to get top 12
    const allVoices = blandData.voices || []
    
    // Function to check if a voice is Indian-related
    const isIndianVoice = (voice: any) => {
      const searchTerms = ['india', 'indian', 'hindi', 'tamil', 'bengali', 'marathi', 'gujarati', 'telugu', 'kannada', 'punjabi', 'malayalam', 'urdu']
      const name = (voice.name || '').toLowerCase()
      const description = (voice.description || '').toLowerCase()
      const tags = (voice.tags || []).map((tag: string) => tag.toLowerCase())
      
      const isIndian = searchTerms.some(term => 
        name.includes(term) ||
        description.includes(term) || 
        tags.some((tag: string) => tag.includes(term))
      )
      
      if (isIndian) {
        console.log("🇮🇳 [INDIAN VOICE FOUND]", {
          id: voice.id,
          name: voice.name,
          description: voice.description,
          tags: voice.tags
        })
      }
      
      return isIndian
    }
    
    // Get Indian voices (regardless of rating)
    const indianVoices = allVoices.filter((voice: any) => isIndianVoice(voice))
    
    // Get top-rated non-Indian voices
    const nonIndianVoices = allVoices
      .filter((voice: any) => 
        !isIndianVoice(voice) && 
        voice.average_rating && 
        voice.total_ratings > 0
      )
      .sort((a: any, b: any) => {
        // Primary sort: average_rating (higher first)
        if (b.average_rating !== a.average_rating) {
          return b.average_rating - a.average_rating
        }
        // Secondary sort: total_ratings (more ratings = more reliable)
        return b.total_ratings - a.total_ratings
      })
    
    // Combine Indian voices with top-rated voices, ensuring we get up to 12 total
    const remainingSlots = Math.max(0, 12 - indianVoices.length)
    const selectedVoices = [
      ...indianVoices,
      ...nonIndianVoices.slice(0, remainingSlots)
    ]

    console.log("🏆 [FILTERING] Voice selection breakdown:", {
      total_available: allVoices.length,
      indian_voices_found: indianVoices.length,
      indian_voice_ids: indianVoices.map((v: any) => ({ id: v.id, name: v.name })),
      with_ratings: allVoices.filter((v: any) => v.average_rating && v.total_ratings > 0).length,
      final_selected: selectedVoices.length,
      final_voice_ids: selectedVoices.map((v: any) => ({ id: v.id, name: v.name })),
      highest_rating: nonIndianVoices[0]?.average_rating || 'N/A'
    })

    console.log("🎉 [SUCCESS] Voice selection completed (Indian + top-rated)")
    console.log("=== END DEBUG TRACE ===\n")

    return NextResponse.json({
      voices: selectedVoices,
      count: selectedVoices.length,
      total_available: allVoices.length,
      indian_voices_included: indianVoices.length,
    })
  } catch (error) {
    console.log("💥 [UNEXPECTED ERROR]", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
