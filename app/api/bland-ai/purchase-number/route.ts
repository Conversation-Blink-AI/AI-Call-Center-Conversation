
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneNumber, areaCode, countryCode = "US" } = body

    if (!phoneNumber) {
      return NextResponse.json({ 
        error: "Phone number is required" 
      }, { status: 400 })
    }

    console.log(`Purchasing number via Bland.ai: ${phoneNumber}`)

    // Get Bland.ai API key from environment variables
    const blandApiKey = process.env.BLAND_API_KEY

    if (!blandApiKey) {
      console.error("Bland.ai API key not found in environment variables")
      return NextResponse.json({ 
        error: "Bland.ai API key not configured" 
      }, { status: 500 })
    }

    try {
      // Call Bland.ai number purchase API
      const blandResponse = await fetch("https://api.bland.ai/numbers/purchase", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${blandApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          area_code: areaCode,
          country_code: countryCode
        })
      })

      if (!blandResponse.ok) {
        const errorText = await blandResponse.text()
        console.error("Bland.ai purchase failed:", errorText)
        throw new Error(`Bland.ai purchase failed: ${blandResponse.status} - ${errorText}`)
      }

      const blandData = await blandResponse.json()
      console.log("Bland.ai purchase successful:", blandData)

      // Store the purchased number in PostgreSQL database
      const { Client } = await import('pg')
      const client = new Client({
        connectionString: process.env.DATABASE_URL
      })

      try {
        await client.connect()
        
        // Extract area code and location from phone number
        const extractedAreaCode = phoneNumber.replace(/\D/g, "").slice(1, 4) // Remove country code and get area code
        const location = getLocationFromAreaCode(extractedAreaCode)
        
        const result = await client.query(
          `INSERT INTO phone_numbers (phone_number, user_id, location, type, status, purchased_at, area_code, country_code)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
           RETURNING *`,
          [
            phoneNumber,
            "current-user-id", // You'll need to get the actual user ID from session
            location,
            "Local",
            "active",
            extractedAreaCode,
            countryCode
          ]
        )
        
        const savedPhone = result.rows[0]
        console.log("Phone number saved to database:", savedPhone)

        return NextResponse.json({
          success: true,
          message: "Phone number purchased successfully",
          data: {
            phoneNumber: savedPhone.phone_number,
            location: savedPhone.location,
            blandResponse: blandData
          }
        })

      } finally {
        await client.end()
      }

    } catch (blandError: any) {
      console.error("Error calling Bland.ai API:", blandError)
      return NextResponse.json({ 
        error: `Bland.ai API error: ${blandError.message}` 
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("Error in purchase-number route:", error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}

// Helper function to get location from area code
function getLocationFromAreaCode(areaCode: string): string {
  const areaCodeMap: { [key: string]: string } = {
    "415": "San Francisco, CA",
    "510": "Oakland, CA",
    "628": "San Francisco, CA",
    "212": "New York, NY",
    "646": "New York, NY",
    "917": "New York, NY",
    "213": "Los Angeles, CA",
    "310": "Los Angeles, CA",
    "424": "Los Angeles, CA",
    "312": "Chicago, IL",
    "773": "Chicago, IL",
    "872": "Chicago, IL",
    "305": "Miami, FL",
    "786": "Miami, FL",
    "954": "Fort Lauderdale, FL",
    "206": "Seattle, WA",
    "425": "Seattle, WA",
    "253": "Tacoma, WA",
    "416": "Toronto, ON",
    "647": "Toronto, ON",
    "437": "Toronto, ON",
    "514": "Montreal, QC",
    "438": "Montreal, QC",
    "604": "Vancouver, BC",
    "778": "Vancouver, BC",
    "236": "Vancouver, BC"
  }

  return areaCodeMap[areaCode] || "Unknown Location"
}
