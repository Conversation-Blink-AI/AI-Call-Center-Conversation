
import { NextResponse } from "next/server"
import { Client } from "pg"
import * as jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, company, phoneNumber } = await request.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ 
        success: false, 
        message: "Email, password, first name, and last name are required" 
      }, { status: 400 })
    }

    console.log("[AUTH/SIGNUP] Attempting external signup for:", email)

    // Call external API for signup FIRST
    const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
    console.log("[AUTH/SIGNUP] Checking API URL - FOREX_URL:", process.env.FOREX_URL, "EXTERNAL_API_URL:", process.env.EXTERNAL_API_URL)
    
    if (!externalApiUrl) {
      console.error("[AUTH/SIGNUP] External API URL not configured")
      return NextResponse.json({
        success: false,
        message: "External API configuration missing. Please configure FOREX_URL environment variable."
      }, { status: 500 })
    }

    console.log("[AUTH/SIGNUP] Using external API URL:", externalApiUrl)

    const externalSignupData = {
      firstName,
      lastName,
      email,
      password,
      phoneNumber: phoneNumber || '',
      platform: "AI Call"
    }

    // Ensure no double slashes in the URL
    const cleanApiUrl = externalApiUrl.endsWith('/') ? externalApiUrl.slice(0, -1) : externalApiUrl
    const apiEndpoint = `${cleanApiUrl}/api/accounts/signup`
    console.log("[AUTH/SIGNUP] Calling external API:", apiEndpoint)
    console.log("[AUTH/SIGNUP] Payload:", JSON.stringify(externalSignupData, null, 2))
    
    const externalResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalSignupData)
    })

    // Get the response text first to avoid body consumption issues
    const responseText = await externalResponse.text()
    console.log("[AUTH/SIGNUP] Raw response status:", externalResponse.status)
    console.log("[AUTH/SIGNUP] Raw response text:", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))

    let externalResult
    try {
      externalResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[AUTH/SIGNUP] Failed to parse external API response:", parseError)
      console.error("[AUTH/SIGNUP] Response was not valid JSON. This usually means the API endpoint is incorrect or the server returned an error page.")
      
      // Check if it's an HTML error page
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        return NextResponse.json({
          success: false,
          message: "External API returned an error page. Please check the API endpoint configuration."
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: false,
        message: "Invalid response from signup service"
      }, { status: 500 })
    }

    // If external API failed, return the error immediately (don't store locally)
    if (!externalResponse.ok) {
      console.error("[AUTH/SIGNUP] External API signup failed:", externalResult)
      return NextResponse.json({
        success: false,
        message: externalResult.message || "External signup failed"
      }, { status: externalResponse.status })
    }

    console.log("[AUTH/SIGNUP] External signup successful:", externalResult)

    // Only proceed to store locally if external API succeeded
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()

      // Check if user already exists in local database AFTER external API success
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      )

      if (existingUser.rows.length > 0) {
        console.log("[AUTH/SIGNUP] User already exists locally but external API succeeded - updating existing record")
        
        // Update existing user with latest data from external API
        const updateResult = await client.query(
          `UPDATE users SET
           first_name = $1,
           last_name = $2,
           company = $3,
           phone_number = $4,
           external_id = $5,
           external_token = $6,
           is_verified = $7,
           platform = $8,
           password_hash = $9,
           updated_at = NOW()
           WHERE email = $10
           RETURNING *`,
          [
            firstName,
            lastName,
            company || '',
            phoneNumber || '',
            externalResult.data?._id || externalResult.data?.id || null,
            externalResult.data?.token || null,
            true, // Set as verified since external API succeeded
            'AI Call',
            password,
            email
          ]
        )

        const localUser = updateResult.rows[0]
        console.log("[AUTH/SIGNUP] Updated existing local user:", localUser.id)

        return NextResponse.json({
          success: true,
          message: externalResult.message || "Account updated successfully",
          user: {
            id: localUser.id,
            email: localUser.email,
            firstName: localUser.first_name,
            lastName: localUser.last_name,
            company: localUser.company,
            phoneNumber: localUser.phone_number,
            isVerified: true
          }
        })
      }

      // Create new local user record since external API succeeded
      const insertResult = await client.query(
        `INSERT INTO users (email, first_name, last_name, company, phone_number, role, external_id, external_token, is_verified, platform, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          email,
          firstName,
          lastName,
          company || '',
          phoneNumber || '',
          'user',
          externalResult.data?._id || externalResult.data?.id || null,
          externalResult.data?.token || null,
          true, // Set as verified since external API succeeded
          'AI Call',
          password
        ]
      )

      const localUser = insertResult.rows[0]
      console.log("[AUTH/SIGNUP] Local user record created:", localUser.id)

      // Return success with external API message
      return NextResponse.json({
        success: true,
        message: externalResult.message || "Account created successfully",
        user: {
          id: localUser.id,
          email: localUser.email,
          firstName: localUser.first_name,
          lastName: localUser.last_name,
          company: localUser.company,
          phoneNumber: localUser.phone_number,
          isVerified: true
        }
      })

    } catch (dbError: any) {
      console.error("[AUTH/SIGNUP] Database error after successful external signup:", dbError)
      
      // Even if local DB fails, external signup succeeded, so we should inform the user
      return NextResponse.json({
        success: true,
        message: "Account created successfully on external service. Local sync will be completed on next login.",
        warning: "Local database sync failed but signup was successful"
      })
    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[AUTH/SIGNUP] Error:", error)
    
    // Handle specific external API errors
    if (error.message?.includes('fetch')) {
      return NextResponse.json({
        success: false,
        message: "Unable to connect to signup service. Please try again later."
      }, { status: 503 })
    }

    return NextResponse.json({ 
      success: false, 
      message: "Internal server error" 
    }, { status: 500 })
  }
}
