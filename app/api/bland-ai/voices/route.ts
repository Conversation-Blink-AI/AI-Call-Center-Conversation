
import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

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

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  console.log("\n=== 🎤 BLAND.AI VOICES API DEBUG TRACE ===")

  try {
    // Authenticate user - use getUserFromRequest for proper cookie handling
    const user = await getUserFromRequest(request)
    if (!user) {
      console.log("❌ [AUTH] Authentication failed - no user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ [AUTH] User authenticated:", user.id, user.email)

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
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    console.log("📡 [RESPONSE] Status:", blandResponse.status)

    const rawResponseText = await blandResponse.text()
    console.log("📄 [RAW RESPONSE] First 200 chars:", rawResponseText.substring(0, 200))

    // Handle non-OK responses
    if (!blandResponse.ok) {
      console.log("❌ [API ERROR] Non-OK response:", blandResponse.status)
      
      // Check if it's an IP blocking error (403)
      if (blandResponse.status === 403 && rawResponseText.includes('Cloud Providers')) {
        console.error("❌ [VOICES] IP blocked by Bland.ai - Cloud provider detected")
        return NextResponse.json(
          {
            error: "Access denied - Cloud provider IP blocked",
            message: "Your server IP is blocked by Bland.ai. Please contact support to whitelist your IP address.",
            details: "The voices endpoint requires IP whitelisting. Contact hello@bland.ai for assistance.",
          },
          { status: 403 },
        )
      }
      
      return NextResponse.json(
        {
          error: `Bland.ai API error: ${blandResponse.status} ${blandResponse.statusText}`,
          details: rawResponseText.substring(0, 500),
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
    const allVoices = Array.isArray(blandData.voices) ? blandData.voices : []
    
    console.log("📊 [VOICES] Processing voices:", {
      total_from_api: allVoices.length,
      first_voice_sample: allVoices[0] ? {
        id: allVoices[0].id,
        name: allVoices[0].name,
        has_rating: !!allVoices[0].average_rating,
        has_tags: Array.isArray(allVoices[0].tags)
      } : null
    })
    
    // Function to check if a voice is Indian-related
    const isIndianVoice = (voice: any) => {
      if (!voice) return false
      
      try {
        const searchTerms = ['india', 'indian', 'hindi', 'tamil', 'bengali', 'marathi', 'gujarati', 'telugu', 'kannada', 'punjabi', 'malayalam', 'urdu']
        const name = (voice.name || '').toLowerCase()
        const description = (voice.description || '').toLowerCase()
        const tags = Array.isArray(voice.tags) ? voice.tags.map((tag: string) => String(tag).toLowerCase()) : []
        
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
      } catch (error) {
        console.warn("⚠️ [VOICES] Error checking if voice is Indian:", error)
        return false
      }
    }
    
    // Get Indian voices (regardless of rating)
    const indianVoices = allVoices.filter((voice: any) => {
      try {
        return isIndianVoice(voice)
      } catch (error) {
        console.warn("⚠️ [VOICES] Error filtering Indian voices:", error)
        return false
      }
    })
    
    // Get top-rated non-Indian voices
    const nonIndianVoices = allVoices
      .filter((voice: any) => {
        try {
          return !isIndianVoice(voice) && 
                 voice && 
                 typeof voice.average_rating === 'number' && 
                 typeof voice.total_ratings === 'number' && 
                 voice.total_ratings > 0
        } catch (error) {
          console.warn("⚠️ [VOICES] Error filtering non-Indian voices:", error)
          return false
        }
      })
      .sort((a: any, b: any) => {
        try {
          // Primary sort: average_rating (higher first)
          if (b.average_rating !== a.average_rating) {
            return b.average_rating - a.average_rating
          }
          // Secondary sort: total_ratings (more ratings = more reliable)
          return (b.total_ratings || 0) - (a.total_ratings || 0)
        } catch (error) {
          console.warn("⚠️ [VOICES] Error sorting voices:", error)
          return 0
        }
      })
    
    // Combine Indian voices with top-rated voices, ensuring we get up to 12 total
    // If no voices with ratings, just return all voices up to 12
    const remainingSlots = Math.max(0, 12 - indianVoices.length)
    let selectedVoices: any[] = []
    
    try {
      selectedVoices = [
        ...indianVoices,
        ...nonIndianVoices.slice(0, remainingSlots)
      ]
      
      // If we still have slots and not enough voices, add more voices without ratings
      if (selectedVoices.length < 12 && allVoices.length > selectedVoices.length) {
        const additionalVoices = allVoices
          .filter((voice: any) => !selectedVoices.some((v: any) => v.id === voice.id))
          .slice(0, 12 - selectedVoices.length)
        selectedVoices = [...selectedVoices, ...additionalVoices]
      }
    } catch (error) {
      console.error("❌ [VOICES] Error combining voices:", error)
      // Fallback: just return first 12 voices
      selectedVoices = allVoices.slice(0, 12)
    }

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
  } catch (error: any) {
    console.log("💥 [UNEXPECTED ERROR]", error)
    console.error("🚨 [VOICES] Error stack:", error?.stack)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : "An error occurred while fetching voices",
        details: process.env.NODE_ENV === "development" ? {
          error_type: error?.name,
          error_message: error?.message,
          stack: error?.stack
        } : undefined
      },
      { status: 500 },
    )
  }
}
