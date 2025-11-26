
import { NextResponse } from "next/server"
import { Client } from "pg"
import * as jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: Request) {
  try {
    const { email, verificationToken } = await request.json()

    if (!email || !verificationToken) {
      return NextResponse.json({
        success: false,
        message: "Email and verification token are required"
      }, { status: 400 })
    }

    console.log("[AUTH/VERIFY] Verifying email for:", email)

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()

      // Find user with matching email and verification token
      const result = await client.query(
        `UPDATE users 
         SET is_verified = true, verification_token = NULL, verification_expires_at = NULL, updated_at = NOW()
         WHERE email = $1 AND verification_token = $2 AND verification_expires_at > NOW()
         RETURNING *`,
        [email, verificationToken]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: "Invalid or expired verification token"
        }, { status: 400 })
      }

      const user = result.rows[0]
      console.log("[AUTH/VERIFY] User verified successfully:", user.email)

      // Generate JWT token for immediate login
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        },
        JWT_SECRET
      )

      // Set HTTP-only cookie
      const cookieStore = cookies()
      cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })

      return NextResponse.json({
        success: true,
        message: "Email verified successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          phoneNumber: user.phone_number,
          role: user.role,
          isVerified: true
        }
      })

    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[AUTH/VERIFY] Error:", error)
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 })
  }
}

// GET endpoint to check verification status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({
        success: false,
        message: "Email parameter is required"
      }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()

      const result = await client.query(
        'SELECT is_verified, verification_expires_at FROM users WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: "User not found"
        }, { status: 404 })
      }

      const user = result.rows[0]

      return NextResponse.json({
        success: true,
        isVerified: user.is_verified,
        hasExpired: user.verification_expires_at && new Date(user.verification_expires_at) < new Date()
      })

    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[AUTH/VERIFY-STATUS] Error:", error)
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 })
  }
}
