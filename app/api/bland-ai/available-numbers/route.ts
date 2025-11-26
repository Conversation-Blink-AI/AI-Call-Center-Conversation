
import { NextResponse } from "next/server"
import { Twilio } from "twilio"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const areaCode = searchParams.get("areaCode") || "415" // Default to 415
    const countryCode = searchParams.get("countryCode") || "US" // Default to US
    const limit = parseInt(searchParams.get("limit") || "9") // Default to 9 numbers

    console.log(`Searching Twilio numbers: areaCode=${areaCode}, country=${countryCode}, limit=${limit}`)

    // Get Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.REPLIT_SECRET_TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.REPLIT_SECRET_TWILIO_AUTH_TOKEN

    console.log("Environment check:", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      envKeys: Object.keys(process.env).filter(key => key.includes('TWILIO'))
    })

    if (!accountSid || !authToken) {
      console.error("Twilio credentials not found in environment variables")
      
      // Return mock data instead of error for development
      const mockNumbers = [
        {
          id: "mock-1",
          number: "+14155551234",
          display: "(415) 555-1234",
          e164: "+14155551234",
          location: "San Francisco, CA",
          type: "Local",
          monthlyFee: "$1.00",
          status: "available",
          capabilities: ["voice", "sms"]
        },
        {
          id: "mock-2", 
          number: "+14155555678",
          display: "(415) 555-5678",
          e164: "+14155555678",
          location: "San Francisco, CA",
          type: "Local",
          monthlyFee: "$1.00",
          status: "available",
          capabilities: ["voice", "sms"]
        }
      ]

      return NextResponse.json({
        numbers: mockNumbers.slice(0, limit),
        usingMockData: true,
        error: "Twilio credentials not configured - using mock data",
        searchParams: {
          areaCode,
          countryCode,
          limit
        }
      })
    }

    // Initialize Twilio client
    const client = new Twilio(accountSid, authToken)

    try {
      // Search for available phone numbers
      const numbers = await client
        .availablePhoneNumbers(countryCode)
        .local.list({
          areaCode: parseInt(areaCode),
          voiceEnabled: true,
          smsEnabled: true,
          limit: limit,
        })

      console.log(`Found ${numbers.length} available numbers from Twilio`)

      // Transform Twilio response to match our expected format
      const transformedNumbers = numbers.map((number, index) => ({
        id: `twilio-${index + 1}`,
        number: number.phoneNumber,
        display: formatPhoneNumber(number.phoneNumber),
        e164: number.phoneNumber,
        location: `${number.locality || 'Unknown'}, ${number.region || countryCode}`,
        type: "Local",
        monthlyFee: "$1.00", // Standard Twilio pricing
        status: "available",
        capabilities: number.capabilities || ["voice", "sms"]
      }))

      return NextResponse.json({
        numbers: transformedNumbers,
        usingMockData: false,
        searchParams: {
          areaCode,
          countryCode,
          limit
        }
      })

    } catch (twilioError: any) {
      console.error("Twilio API error:", twilioError)
      
      // Return empty array if Twilio fails
      return NextResponse.json({
        numbers: [],
        usingMockData: true,
        error: `Twilio API error: ${twilioError.message}`,
        searchParams: {
          areaCode,
          countryCode,
          limit
        }
      })
    }

  } catch (error: any) {
    console.error("Error in available-numbers route:", error)
    return NextResponse.json({ 
      error: error.message,
      usingMockData: true,
      numbers: []
    }, { status: 500 })
  }
}

// Helper function to format phone numbers
function formatPhoneNumber(phoneNumber: string): string {
  // Remove +1 country code if present
  const cleaned = phoneNumber.replace(/^\+1/, "")
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  return phoneNumber // Return original if formatting fails
}
