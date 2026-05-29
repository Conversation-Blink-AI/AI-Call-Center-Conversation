import { NextResponse } from "next/server"
import { Client } from "pg"
import * as jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { getSSLConfig } from "@/lib/db-client"
import { normalizeEmail } from "@/lib/utils"
import { encryptString, hashEmail, hashPhoneNumber, phoneLast4 } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"
import { extractForexAuthFields } from "@/lib/forex-permissions"
import { syncForexOrgMemberships } from "@/lib/forex-org-sync"
import { decodeJwtPayload, mergeDefined } from "@/lib/forex-token"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: Request) {
  try {
    const { pending2FAToken, code } = await request.json()

    if (!pending2FAToken || !code) {
      return NextResponse.json({
        success: false,
        message: "pending2FAToken and code are required"
      }, { status: 400 })
    }

    const externalApiUrl = process.env.FOREX_URL || process.env.EXTERNAL_API_URL
    if (!externalApiUrl) {
      console.error("[AUTH/2FA] External API URL not configured")
      return NextResponse.json({
        success: false,
        message: "External API configuration missing. Please configure FOREX_URL environment variable."
      }, { status: 500 })
    }

    const cleanApiUrl = externalApiUrl.endsWith('/') ? externalApiUrl.slice(0, -1) : externalApiUrl
    const apiEndpoint = `${cleanApiUrl}/api/accounts/2fa/verify`

    console.log("[AUTH/2FA] Calling external API:", apiEndpoint)

    const externalResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pending2FAToken, code })
    })

    const responseText = await externalResponse.text()
    console.log("[AUTH/2FA] External API response status:", externalResponse.status)
    console.log("[AUTH/2FA] External API response:", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))

    let externalResult
    try {
      externalResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[AUTH/2FA] Failed to parse external API response:", parseError)
      return NextResponse.json({
        success: false,
        message: "Invalid response from authentication service"
      }, { status: 500 })
    }

    if (!externalResponse.ok || externalResult.status !== "success") {
      console.log("[AUTH/2FA] External verification failed:", externalResult.message)
      return NextResponse.json({
        success: false,
        message: externalResult.message || "Invalid verification code"
      }, { status: 401 })
    }

    const externalUserData = externalResult.data || {}
    const externalToken = externalUserData.token || externalResult.token
    const externalTokenPayload = decodeJwtPayload(externalToken)
    const externalProfile = mergeDefined(externalTokenPayload, externalUserData)
    const forexAuthFields = extractForexAuthFields(externalProfile, externalUserData.role || "client")
    const normalizedEmail = normalizeEmail(externalUserData.email || "")

    if (!normalizedEmail) {
      return NextResponse.json({
        success: false,
        message: "Verification succeeded but email was missing from the response."
      }, { status: 500 })
    }

    const normalizedPhone = externalUserData?.phoneNumber ? toE164Format(externalUserData.phoneNumber) : ""
    const emailEnc = encryptString(normalizedEmail)
    const emailHash = hashEmail(normalizedEmail)
    const phoneEnc = normalizedPhone ? encryptString(normalizedPhone) : null
    const phoneHash = normalizedPhone ? hashPhoneNumber(normalizedPhone) : null
    const phoneLast = normalizedPhone ? phoneLast4(normalizedPhone) : null

    if (!process.env.DATABASE_URL) {
      console.error("[AUTH/2FA] DATABASE_URL environment variable is not set")
      return NextResponse.json({
        success: false,
        message: "Database configuration missing. Please configure DATABASE_URL environment variable."
      }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(),
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
    })

    let localUser = null
    try {
      await client.connect()
      console.log("[AUTH/2FA] Successfully connected to database")

      const existingUserResult = await client.query(
        'SELECT * FROM users WHERE email_hash = $1 OR LOWER(email) = LOWER($2)',
        [emailHash, normalizedEmail]
      )

      if (existingUserResult.rows.length > 0) {
        const updateResult = await client.query(
          `UPDATE users SET
           first_name = $1,
           last_name = $2,
           phone_number = $3,
           phone_number_enc = $4,
           phone_number_hash = $5,
           phone_number_last4 = $6,
           role = $7,
           external_id = $8,
           external_token = $9,
           is_verified = $10,
           platform = $11,
           last_login = NOW(),
           updated_at = NOW()
           WHERE email_hash = $12 OR email = $13
           RETURNING *`,
          [
            externalUserData.firstName,
            externalUserData.lastName,
            normalizedPhone || null,
            phoneEnc,
            phoneHash,
            phoneLast,
            externalUserData.role || 'client',
            externalUserData._id || externalProfile.id,
            externalToken,
            Boolean(externalUserData.verified),
            'AI Call',
            emailHash,
            normalizedEmail
          ]
        )
        localUser = updateResult.rows[0]
        console.log("[AUTH/2FA] Updated existing local user:", localUser.id)
      } else {
        const insertResult = await client.query(
          `INSERT INTO users (
            email,
            email_enc,
            email_hash,
            first_name,
            last_name,
            phone_number,
            phone_number_enc,
            phone_number_hash,
            phone_number_last4,
            role,
            external_id,
            external_token,
            is_verified,
            platform,
            password_hash,
            created_at,
            updated_at,
            last_login
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), NOW())
          RETURNING *`,
          [
            normalizedEmail,
            emailEnc,
            emailHash,
            externalUserData.firstName,
            externalUserData.lastName,
            normalizedPhone || null,
            phoneEnc,
            phoneHash,
            phoneLast,
            externalUserData.role || 'client',
            externalUserData._id || externalProfile.id,
            externalToken,
            Boolean(externalUserData.verified),
            'AI Call',
            ''
          ]
        )
        localUser = insertResult.rows[0]
        console.log("[AUTH/2FA] Created new local user:", localUser.id)
      }

      if (localUser?.id) {
        await syncForexOrgMemberships(client, localUser.id, externalProfile as any)
      }
    } catch (dbError: any) {
      console.error("[AUTH/2FA] Database error:", dbError)
      console.error("[AUTH/2FA] Error code:", dbError.code)
      console.error("[AUTH/2FA] Error message:", dbError.message)
      await client.end().catch(() => {})
      return NextResponse.json({
        success: false,
        message: `Database error: ${dbError.message || 'Unknown database error'}. Please check your database connection and try again.`
      }, { status: 500 })
    } finally {
      try {
        await client.end()
      } catch (closeError) {
        console.error("[AUTH/2FA] Error closing database connection:", closeError)
      }
    }

    const localToken = jwt.sign(
      {
        userId: localUser.id,
        email: localUser.email,
        externalId: externalUserData._id || externalProfile.id,
        externalToken,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      },
      JWT_SECRET
    )

    const cookieStore = await cookies()
    cookieStore.set("auth-token", localToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      domain: process.env.NODE_ENV === "production" ? undefined : undefined
    })

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
        permissions: forexAuthFields.permissions,
        orgMemberships: forexAuthFields.orgMemberships,
        activeOrgId: forexAuthFields.activeOrgId,
        activeRole: forexAuthFields.activeRole,
        createdDate: externalUserData.createdDate,
        updatedDate: externalUserData.updatedDate
      },
      token: externalToken,
      externalToken
    })
  } catch (error: any) {
    console.error("[AUTH/2FA] Unexpected error:", error)
    return NextResponse.json({
      success: false,
      message: error.message || "An internal server error occurred. Please try again later."
    }, { status: 500 })
  }
}
