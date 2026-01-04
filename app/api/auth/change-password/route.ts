import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import * as jwt from "jsonwebtoken"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({
        success: false,
        message: "Password is required"
      }, { status: 400 })
    }

    console.log("[AUTH/CHANGE-PASSWORD] Attempting to change password")

    // Get auth token from cookies
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      console.error("[AUTH/CHANGE-PASSWORD] No auth token found")
      return NextResponse.json({
        success: false,
        message: "Authentication required. Please log in again."
      }, { status: 401 })
    }

    // Verify JWT token and get user ID
    let decoded: { userId: string; [key: string]: any }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch (jwtError: any) {
      console.error("[AUTH/CHANGE-PASSWORD] JWT verification failed:", jwtError.message)
      return NextResponse.json({
        success: false,
        message: "Invalid or expired session. Please log in again."
      }, { status: 401 })
    }

    // Get user from database to retrieve external_token
    if (!process.env.DATABASE_URL) {
      console.error("[AUTH/CHANGE-PASSWORD] DATABASE_URL not configured")
      return NextResponse.json({
        success: false,
        message: "Database configuration missing"
      }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(),
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
    })

    let user: any
    try {
      await client.connect()
      const result = await client.query(
        'SELECT id, email, external_token FROM users WHERE id = $1',
        [decoded.userId]
      )

      if (result.rows.length === 0) {
        await client.end()
        return NextResponse.json({
          success: false,
          message: "User not found"
        }, { status: 404 })
      }

      user = result.rows[0]
      await client.end()
    } catch (dbError: any) {
      console.error("[AUTH/CHANGE-PASSWORD] Database error:", dbError)
      await client.end().catch(() => {})
      return NextResponse.json({
        success: false,
        message: "Database error occurred"
      }, { status: 500 })
    }

    // Get external token
    const externalToken = user.external_token
    if (!externalToken) {
      console.error("[AUTH/CHANGE-PASSWORD] No external token found for user")
      return NextResponse.json({
        success: false,
        message: "Authentication token not found. Please log in again."
      }, { status: 401 })
    }

    // Get external API URL
    const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
    if (!externalApiUrl) {
      console.error("[AUTH/CHANGE-PASSWORD] External API URL not configured")
      return NextResponse.json({
        success: false,
        message: "External API configuration missing. Please configure FOREX_URL environment variable."
      }, { status: 500 })
    }

    // Prepare external API request
    const cleanApiUrl = externalApiUrl.endsWith('/') ? externalApiUrl.slice(0, -1) : externalApiUrl
    const apiEndpoint = `${cleanApiUrl}/api/accounts/change-password`

    const requestData = {
      password
    }

    console.log("[AUTH/CHANGE-PASSWORD] Calling external API:", apiEndpoint)
    console.log("[AUTH/CHANGE-PASSWORD] User:", user.email)

    // Call external API for change password
    const externalResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${externalToken}`
      },
      body: JSON.stringify(requestData)
    })

    const responseText = await externalResponse.text()
    console.log("[AUTH/CHANGE-PASSWORD] External API response status:", externalResponse.status)
    console.log("[AUTH/CHANGE-PASSWORD] External API response:", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))

    // Check if the request was successful
    if (!externalResponse.ok) {
      // Try to parse error response
      let errorMessage = "Failed to change password"
      try {
        const errorResult = JSON.parse(responseText)
        errorMessage = errorResult.message || errorMessage
      } catch (parseError) {
        // If response is not JSON, use default message
      }

      return NextResponse.json({
        success: false,
        message: errorMessage
      }, { status: externalResponse.status })
    }

    // Success - password changed
    console.log("[AUTH/CHANGE-PASSWORD] Password changed successfully")
    return NextResponse.json({
      success: true,
      message: "Password changed successfully"
    })

  } catch (error: any) {
    console.error("[AUTH/CHANGE-PASSWORD] Unexpected error:", error)
    return NextResponse.json({
      success: false,
      message: error.message || "An unexpected error occurred"
    }, { status: 500 })
  }
}

