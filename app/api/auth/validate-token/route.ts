
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import * as jwt from "jsonwebtoken"
import { Client } from "pg"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const EXTERNAL_API_URL = process.env.FOREX_URL || process.env.EXTERNAL_API_URL

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({
        success: false,
        message: "No token provided"
      }, { status: 400 })
    }

    console.log("[VALIDATE-TOKEN] Validating external token...")

    if (!EXTERNAL_API_URL) {
      console.error("[VALIDATE-TOKEN] External API URL not configured")
      return NextResponse.json({
        success: false,
        message: "External API not configured"
      }, { status: 500 })
    }

    // Decode the external JWT token to get user information
    let externalUserData: any
    try {
      // Decode JWT without verification (since it's from trusted external source)
      const base64Payload = token.split('.')[1]
      const payload = Buffer.from(base64Payload, 'base64').toString('utf-8')
      externalUserData = JSON.parse(payload)
      
      console.log("[VALIDATE-TOKEN] External JWT decoded successfully for user:", externalUserData.email)
      
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000)
      if (externalUserData.exp && externalUserData.exp < currentTime) {
        console.log("[VALIDATE-TOKEN] External token is expired")
        return NextResponse.json({
          success: false,
          message: "Token has expired"
        }, { status: 401 })
      }

    } catch (decodeError: any) {
      console.error("[VALIDATE-TOKEN] Failed to decode external token:", decodeError.message)
      return NextResponse.json({
        success: false,
        message: "Invalid token format"
      }, { status: 401 })
    }

    // Extract user information from external API response
    const userEmail = externalUserData.email
    const externalId = externalUserData.id || externalUserData._id

    if (!userEmail) {
      console.log("[VALIDATE-TOKEN] No email found in external user data")
      return NextResponse.json({
        success: false,
        message: "Invalid user data from external service"
      }, { status: 401 })
    }

    // Get or sync user in local database
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    let user: any
    try {
      await client.connect()

      // Try to find user by email first
      let result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [userEmail]
      )

      if (result.rows.length === 0) {
        // User doesn't exist, create new user
        console.log("[VALIDATE-TOKEN] Creating new user:", userEmail)
        
        result = await client.query(
          `INSERT INTO users (
            email, 
            first_name, 
            last_name, 
            company, 
            phone_number, 
            role, 
            external_id, 
            external_token,
            is_verified,
            platform,
            created_at,
            updated_at,
            last_login
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW()) 
          RETURNING *`,
          [
            userEmail,
            externalUserData.firstName || externalUserData.first_name || 'User',
            externalUserData.lastName || externalUserData.last_name || '',
            externalUserData.company || '',
            externalUserData.phoneNumber || externalUserData.phone_number || '',
            externalUserData.role || 'client',
            externalId,
            token,
            externalUserData.verified || false,
            externalUserData.platform || 'AI Call'
          ]
        )
      } else {
        // User exists, update their information and token
        console.log("[VALIDATE-TOKEN] Updating existing user:", userEmail)
        
        result = await client.query(
          `UPDATE users SET 
            first_name = $2,
            last_name = $3,
            company = $4,
            phone_number = $5,
            role = $6,
            external_id = $7,
            external_token = $8,
            is_verified = $9,
            updated_at = NOW(),
            last_login = NOW()
          WHERE email = $1 
          RETURNING *`,
          [
            userEmail,
            externalUserData.firstName || externalUserData.first_name || 'User',
            externalUserData.lastName || externalUserData.last_name || '',
            externalUserData.company || '',
            externalUserData.phoneNumber || externalUserData.phone_number || '',
            externalUserData.role || 'client',
            externalId,
            token,
            externalUserData.verified || false
          ]
        )
      }

      user = result.rows[0]
      console.log("[VALIDATE-TOKEN] User synced:", user.email)

    } finally {
      await client.end()
    }

    // Create a new local session token for the user
    const sessionToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set("auth-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/"
    })

    console.log("[VALIDATE-TOKEN] Local session cookie set successfully")

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName || "User",
        lastName: user.last_name || user.lastName || "",
        company: user.company || "",
        role: user.role || "client",
        phoneNumber: user.phone_number || user.phoneNumber || "",
        verified: user.verified || user.is_verified || false,
        platforms: user.platforms || []
      }
    })

  } catch (error: any) {
    console.error("[VALIDATE-TOKEN] Error:", error)
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 })
  }
}
