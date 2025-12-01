import { NextResponse } from "next/server"
import { Client } from "pg"
import * as jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Helper function to get SSL config for DigitalOcean
function getSSLConfig() {
  const dbUrl = process.env.DATABASE_URL || ""
  // Check if connecting to DigitalOcean (by IP or hostname)
  if (dbUrl.includes("ondigitalocean.com") || dbUrl.includes("157.245.104.224")) {
    // DigitalOcean uses self-signed certificates, so we need to allow them
    return { rejectUnauthorized: false }
  }
  return undefined // Use default SSL settings for other databases
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: "Email and password are required"
      }, { status: 400 })
    }

    console.log("[AUTH/LOGIN] Attempting external API login for:", email)

    // Get external API URL
    const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
    if (!externalApiUrl) {
      console.error("[AUTH/LOGIN] External API URL not configured")
      return NextResponse.json({
        success: false,
        message: "External API configuration missing. Please configure FOREX_URL environment variable."
      }, { status: 500 })
    }

    // Prepare external API login request
    const cleanApiUrl = externalApiUrl.endsWith('/') ? externalApiUrl.slice(0, -1) : externalApiUrl
    const apiEndpoint = `${cleanApiUrl}/api/accounts/login`

    const externalLoginData = {
      email,
      password,
      platform: "AI Call"
    }

    console.log("[AUTH/LOGIN] Calling external API:", apiEndpoint)
    console.log("[AUTH/LOGIN] Payload:", JSON.stringify(externalLoginData, null, 2))

    // Call external API for authentication
    const externalResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalLoginData)
    })

    const responseText = await externalResponse.text()
    console.log("[AUTH/LOGIN] External API response status:", externalResponse.status)
    console.log("[AUTH/LOGIN] External API response:", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))

    // Parse external API response
    let externalResult
    try {
      externalResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[AUTH/LOGIN] Failed to parse external API response:", parseError)
      return NextResponse.json({
        success: false,
        message: "Invalid response from authentication service"
      }, { status: 500 })
    }

    // Check if external authentication failed
    if (!externalResponse.ok || externalResult.status !== "success") {
      console.log("[AUTH/LOGIN] External authentication failed:", externalResult.message)
      return NextResponse.json({
        success: false,
        message: externalResult.message || "Invalid email or password"
      }, { status: 401 })
    }

    console.log("[AUTH/LOGIN] External authentication successful")
    const externalUserData = externalResult.data

    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error("[AUTH/LOGIN] DATABASE_URL environment variable is not set")
      return NextResponse.json({
        success: false,
        message: "Database configuration missing. Please configure DATABASE_URL environment variable."
      }, { status: 500 })
    }

    // Connect to PostgreSQL to sync user data
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(),
      connectionTimeoutMillis: 10000, // 10 seconds timeout for connection
      query_timeout: 30000, // 30 seconds timeout for queries
    })

    let localUser = null
    try {
      await client.connect()
      console.log("[AUTH/LOGIN] Successfully connected to database")

      // Check if user exists in local database
      const existingUserResult = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      )

      if (existingUserResult.rows.length > 0) {
        // Update existing user with latest data from external API
        const updateResult = await client.query(
          `UPDATE users SET
           first_name = $1,
           last_name = $2,
           phone_number = $3,
           role = $4,
           external_id = $5,
           external_token = $6,
           is_verified = $7,
           platform = $8,
           last_login = NOW(),
           updated_at = NOW()
           WHERE email = $9
           RETURNING *`,
          [
            externalUserData.firstName,
            externalUserData.lastName,
            externalUserData.phoneNumber,
            externalUserData.role || 'client',
            externalUserData._id,
            externalUserData.token,
            Boolean(externalUserData.verified), // Ensure boolean conversion
            'AI Call', // Corrected platform
            email
          ]
        )
        localUser = updateResult.rows[0]
        console.log("[AUTH/LOGIN] Updated existing local user:", localUser.id)
      } else {
        // Create new local user record
        const insertResult = await client.query(
          `INSERT INTO users (
            email, first_name, last_name, phone_number, role,
            external_id, external_token, is_verified, platform,
            password_hash, created_at, updated_at, last_login
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
          RETURNING *`,
          [
            email,
            externalUserData.firstName,
            externalUserData.lastName,
            externalUserData.phoneNumber,
            externalUserData.role || 'client',
            externalUserData._id,
            externalUserData.token,
            Boolean(externalUserData.verified), // Ensure boolean conversion
            'AI Call', // Corrected platform
            password // Store password as backup
          ]
        )
        localUser = insertResult.rows[0]
        console.log("[AUTH/LOGIN] Created new local user:", localUser.id)
      }

    } catch (dbError: any) {
      console.error("[AUTH/LOGIN] Database error:", dbError)
      console.error("[AUTH/LOGIN] Error code:", dbError.code)
      console.error("[AUTH/LOGIN] Error message:", dbError.message)
      await client.end().catch(() => {}) // Try to close connection, ignore errors
      
      // Return more specific error message
      if (dbError.code === 'ECONNREFUSED') {
        return NextResponse.json({
          success: false,
          message: "Unable to connect to database. The database server may be down or unreachable. Please check your database configuration."
        }, { status: 500 })
      } else if (dbError.code === 'ENOTFOUND') {
        return NextResponse.json({
          success: false,
          message: "Database host not found. Please check your DATABASE_URL configuration."
        }, { status: 500 })
      } else if (dbError.code === 'ETIMEDOUT' || dbError.message?.includes('ETIMEDOUT') || dbError.message?.includes('timeout')) {
        return NextResponse.json({
          success: false,
          message: "Database connection timed out. The database server may be slow to respond or unreachable. Please check your network connection and database server status."
        }, { status: 500 })
      } else if (dbError.message?.includes('password authentication failed')) {
        return NextResponse.json({
          success: false,
          message: "Database authentication failed. Please check your DATABASE_URL credentials."
        }, { status: 500 })
      } else if (dbError.message?.includes('SSL') || dbError.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
        return NextResponse.json({
          success: false,
          message: "Database SSL connection error. Please check your SSL configuration."
        }, { status: 500 })
      } else {
        return NextResponse.json({
          success: false,
          message: `Database error: ${dbError.message || 'Unknown database error'}. Please check your database connection and try again.`
        }, { status: 500 })
      }
    } finally {
      try {
        await client.end()
      } catch (closeError) {
        console.error("[AUTH/LOGIN] Error closing database connection:", closeError)
      }
    }

    // Create local JWT token for compatibility
    const localToken = jwt.sign(
      {
        userId: localUser.id,
        email: localUser.email,
        externalId: externalUserData._id,
        externalToken: externalUserData.token,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      },
      JWT_SECRET
    )

    // Set HTTP-only cookie for server-side authentication
    const cookieStore = await cookies()
    cookieStore.set("auth-token", localToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    // Return user data with external token for localStorage storage
    return NextResponse.json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: localUser.id,
        _id: externalUserData._id,
        firstName: externalUserData.firstName,
        lastName: externalUserData.lastName,
        email: externalUserData.email,
        phoneNumber: externalUserData.phoneNumber,
        role: externalUserData.role,
        status: externalUserData.status,
        verified: externalUserData.verified,
        platforms: externalUserData.platforms,
        createdDate: externalUserData.createdDate,
        updatedDate: externalUserData.updatedDate
      },
      // Include external token for frontend localStorage storage
      token: externalUserData.token,
      externalToken: externalUserData.token
    })

  } catch (error: any) {
    console.error("[AUTH/LOGIN] Unexpected error:", error)
    console.error("[AUTH/LOGIN] Error stack:", error.stack)

    // Handle network errors
    if (error.message?.includes('fetch') || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return NextResponse.json({
        success: false,
        message: "Unable to connect to authentication service. Please check your network connection and try again later."
      }, { status: 503 })
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        message: "Invalid response from server. Please try again."
      }, { status: 500 })
    }

    // Return more descriptive error message
    return NextResponse.json({
      success: false,
      message: error.message || "An internal server error occurred. Please try again later."
    }, { status: 500 })
  }
}