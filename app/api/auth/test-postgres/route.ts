
import { NextResponse } from "next/server"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL environment variable is not set"
    }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
    connectionTimeoutMillis: 10000, // 10 seconds timeout for connection
    query_timeout: 30000, // 30 seconds timeout for queries
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

  } catch (error: any) {
    console.error("❌ PostgreSQL auth test error:", error)
    console.error("❌ Error code:", error.code)
    console.error("❌ Error message:", error.message)
    
    let errorMessage = "Failed to verify PostgreSQL authentication"
    if (error.code === 'ETIMEDOUT' || error.message?.includes('ETIMEDOUT') || error.message?.includes('timeout')) {
      errorMessage = "Database connection timed out. The database server may be slow to respond or unreachable. Please check your network connection and database server status."
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = "Unable to connect to database. The database server may be down or unreachable."
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = "Database host not found. Please check your DATABASE_URL configuration."
    }
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: error.code || "UNKNOWN"
    }, { status: 500 })
  } finally {
    try {
      await client.end()
    } catch (closeError) {
      console.error("Error closing database connection:", closeError)
    }
  }
}
