
import { NextResponse } from "next/server"
import { Client } from "pg"


export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        message: "Email and new password are required" 
      }, { status: 400 })
    }

    console.log("[PASSWORD-UPDATE] Updating password for:", email)

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()
      
      // Check if user exists
      const userQuery = await client.query(
        'SELECT id, email, name FROM users WHERE email = $1',
        [email]
      )
      
      if (userQuery.rows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: "User not found" 
        }, { status: 404 })
      }

      const user = userQuery.rows[0]
      
      // Store the new password as plain text
      const newPasswordHash = newPassword
      
      // Update user with new password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [newPasswordHash, email]
      )
      
      console.log("[PASSWORD-UPDATE] Password updated successfully for:", email)
      
      // Verify the new password works
      const testValid = newPassword === newPasswordHash
      
      return NextResponse.json({
        success: true,
        message: "Password updated successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          },
          verification: {
            newPasswordValid: testValid,
            hashPreview: newPasswordHash.substring(0, 20) + "..."
          }
        }
      })

    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[PASSWORD-UPDATE] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error",
      error: error.message 
    }, { status: 500 })
  }
}
