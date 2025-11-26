
import { NextResponse } from "next/server"
import { Client } from "pg"

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL environment variable is not set"
    }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    
    // Test if users table exists and has data
    const result = await client.query(`
      SELECT 
        COUNT(*) as user_count,
        COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as users_with_passwords
      FROM users
    `)
    
    const stats = result.rows[0]
    
    // Get sample user (without password)
    const sampleResult = await client.query(`
      SELECT id, email, name, role, created_at 
      FROM users 
      WHERE password_hash IS NOT NULL 
      LIMIT 1
    `)
    
    return NextResponse.json({
      success: true,
      message: "PostgreSQL authentication setup verified",
      data: {
        total_users: parseInt(stats.user_count),
        users_with_passwords: parseInt(stats.users_with_passwords),
        sample_user: sampleResult.rows[0] || null,
        database_ready: true
      }
    })

  } catch (error) {
    console.error("❌ PostgreSQL auth test error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to verify PostgreSQL authentication",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    await client.end()
  }
}
