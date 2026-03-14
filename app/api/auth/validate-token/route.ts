
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import * as jwt from "jsonwebtoken"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { normalizeEmail } from "@/lib/utils"
import { encryptString, hashEmail, hashPhoneNumber, phoneLast4 } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"

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

    const normalizedEmail = normalizeEmail(userEmail)
    const normalizedPhone = externalUserData.phoneNumber || externalUserData.phone_number
      ? toE164Format(externalUserData.phoneNumber || externalUserData.phone_number)
      : ""
    const emailEnc = encryptString(normalizedEmail)
    const emailHash = hashEmail(normalizedEmail)
    const phoneEnc = normalizedPhone ? encryptString(normalizedPhone) : null
    const phoneHash = normalizedPhone ? hashPhoneNumber(normalizedPhone) : null
    const phoneLast = normalizedPhone ? phoneLast4(normalizedPhone) : null

    // Get or sync user in local database
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

    let user: any
    try {
      await client.connect()

      // Try to find user by email first
      let result = await client.query(
        'SELECT * FROM users WHERE email_hash = $1::text OR email = $2::text',
        [emailHash, normalizedEmail]
      )

      if (result.rows.length === 0) {
        // User doesn't exist, create new user
        console.log("[VALIDATE-TOKEN] Creating new user:", userEmail)
        
        result = await client.query(
          `INSERT INTO users (
            email,
            email_enc,
            email_hash,
            first_name,
            last_name,
            company,
            phone_number,
            phone_number_enc,
            phone_number_hash,
            phone_number_last4,
            role,
            external_id,
            external_token,
            is_verified,
            platform,
            created_at,
            updated_at,
            last_login
          ) VALUES (
            $1::text,
            $2::text,
            $3::text,
            $4::text,
            $5::text,
            $6::text,
            $7::text,
            $8::text,
            $9::text,
            $10::text,
            $11::text,
            $12::text,
            $13::text,
            $14::boolean,
            $15::text,
            NOW(), NOW(), NOW()
          ) 
          RETURNING *`,
          [
            normalizedEmail,
            emailEnc,
            emailHash,
            externalUserData.firstName || externalUserData.first_name || 'User',
            externalUserData.lastName || externalUserData.last_name || '',
            externalUserData.company || '',
            normalizedPhone || null,
            phoneEnc,
            phoneHash,
            phoneLast,
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
            first_name = $1::text,
            last_name = $2::text,
            company = $3::text,
            phone_number = $4::text,
            phone_number_enc = $5::text,
            phone_number_hash = $6::text,
            phone_number_last4 = $7::text,
            role = $8::text,
            external_id = $9::text,
            external_token = $10::text,
            is_verified = $11::boolean,
            updated_at = NOW(),
            last_login = NOW()
          WHERE email_hash = $12::text OR email = $13::text
          RETURNING *`,
          [
            externalUserData.firstName || externalUserData.first_name || 'User',
            externalUserData.lastName || externalUserData.last_name || '',
            externalUserData.company || '',
            normalizedPhone || null,
            phoneEnc,
            phoneHash,
            phoneLast,
            externalUserData.role || 'client',
            externalId,
            token,
            externalUserData.verified || false,
            emailHash,
            normalizedEmail
          ]
        )
      }

      user = result.rows[0]
      console.log("[VALIDATE-TOKEN] User synced:", user.email)

      // Ensure wallet exists for this user (new or existing)
      try {
        const walletCheck = await client.query(
          'SELECT id FROM wallets WHERE user_id = $1',
          [user.id]
        )
        if (walletCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO wallets (user_id, balance_cents, updated_at)
             VALUES ($1, 0, NOW())`,
            [user.id]
          )
          console.log("[VALIDATE-TOKEN] Created wallet for user:", user.id)
        }
      } catch (walletError) {
        console.error("[VALIDATE-TOKEN] Failed to ensure wallet for user:", walletError)
      }

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
    const isProd = process.env.NODE_ENV === "production"
    const message = isProd ? "Internal server error" : error?.message || "Internal server error"
    return NextResponse.json({
      success: false,
      message
    }, { status: 500 })
  }
}
