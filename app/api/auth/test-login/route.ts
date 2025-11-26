
import { NextResponse } from "next/server"
import { Client } from "pg"


export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "Email and password are required" 
      }, { status: 400 })
    }

    console.log("[TEST-LOGIN] Testing login for:", email)

    // Connect to PostgreSQL
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    let user = null
    try {
      await client.connect()
      
      // Query user from PostgreSQL
      const result = await client.query(
        'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        console.log("[TEST-LOGIN] User not found:", email)
        return NextResponse.json({ 
          success: false, 
          message: "User not found in database",
          debug: {
            email_searched: email,
            users_in_db: "Check if email exists in users table"
          }
        }, { status: 404 })
      }

      user = result.rows[0]
      console.log("[TEST-LOGIN] User found:", {
        id: user.id,
        email: user.email,
        name: user.name,
        has_password_hash: !!user.password_hash
      })
      
    } finally {
      await client.end()
    }

    // Check if password hash exists
    if (!user.password_hash) {
      return NextResponse.json({ 
        success: false, 
        message: "User has no password set",
        debug: {
          user_id: user.id,
          email: user.email,
          password_hash_exists: false
        }
      }, { status: 400 })
    }

    // Test password validation (plain text comparison)
    const isValidPassword = password === user.password_hash
    
    console.log("[TEST-LOGIN] Password validation result:", isValidPassword)

    return NextResponse.json({
      success: true,
      message: isValidPassword ? "Login successful!" : "Invalid password",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at
        },
        password_valid: isValidPassword,
        authentication_method: "PostgreSQL",
        database_connection: "SUCCESS"
      }
    })

  } catch (error: any) {
    console.error("[TEST-LOGIN] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error",
      error: error.message,
      debug: {
        database_url_configured: !!process.env.DATABASE_URL
      }
    }, { status: 500 })
  }
}

// GET endpoint to check database connectivity and user count
export async function GET() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })

    try {
      await client.connect()
      
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as users_with_passwords,
          COUNT(CASE WHEN password_hash IS NULL THEN 1 END) as users_without_passwords
        FROM users
      `)
      
      const stats = result.rows[0]
      
      // Get sample users
      const sampleResult = await client.query(`
        SELECT email, name, 
               CASE WHEN password_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_password
        FROM users 
        ORDER BY created_at DESC
        LIMIT 5
      `)
      
      return NextResponse.json({
        success: true,
        message: "Database connection successful",
        data: {
          total_users: parseInt(stats.total_users),
          users_with_passwords: parseInt(stats.users_with_passwords),
          users_without_passwords: parseInt(stats.users_without_passwords),
          sample_users: sampleResult.rows,
          ready_for_authentication: parseInt(stats.users_with_passwords) > 0
        }
      })
      
    } finally {
      await client.end()
    }

  } catch (error: any) {
    console.error("[TEST-LOGIN] Database check error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to connect to database",
      error: error.message
    }, { status: 500 })
  }
}
