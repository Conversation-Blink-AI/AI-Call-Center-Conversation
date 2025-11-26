
import { NextResponse } from "next/server"
import { db } from "@/lib/replit-db-server"

export async function GET() {
  try {
    console.log("[DEBUG/DB-USERS] Checking database users...")
    
    // Get all keys to see what's stored
    const allKeys = await db.list()
    console.log("[DEBUG/DB-USERS] All keys:", allKeys)
    
    // Filter user keys
    const userKeys = allKeys.filter(key => key.startsWith('user:'))
    console.log("[DEBUG/DB-USERS] User keys:", userKeys)
    
    const users = []
    for (const key of userKeys) {
      const userData = await db.get(key)
      console.log(`[DEBUG/DB-USERS] Data for ${key}:`, userData)
      users.push({
        key,
        data: userData,
        type: typeof userData,
        keys: userData ? Object.keys(userData) : 'null'
      })
    }
    
    return NextResponse.json({
      success: true,
      allKeys: allKeys.slice(0, 20), // Limit to first 20 for readability
      userKeys,
      users
    })
    
  } catch (error: any) {
    console.error("[DEBUG/DB-USERS] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}
