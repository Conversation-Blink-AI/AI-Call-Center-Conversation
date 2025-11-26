
import { NextResponse } from "next/server"
import { db } from "@/lib/replit-db-server"
import * as bcrypt from "bcryptjs"

export async function POST() {
  try {
    console.log("[DEBUG/FIX-USERS] Creating test user...")
    
    // Create a properly structured test user
    const testUser = {
      id: "test-user-1",
      email: "test1@gmail.com",
      name: "Test User",
      company: "Test Company",
      role: "user",
      phoneNumber: "+1-555-0101",
      passwordHash: await bcrypt.hash("testpass", 12),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null
    }
    
    // Store the user
    await db.set(`user:${testUser.email}`, testUser)
    console.log("[DEBUG/FIX-USERS] Test user created")
    
    // Verify it was stored correctly
    const storedUser = await db.get(`user:${testUser.email}`)
    console.log("[DEBUG/FIX-USERS] Verified stored user:", storedUser)
    
    return NextResponse.json({
      success: true,
      message: "Test user created successfully",
      userKeys: Object.keys(storedUser || {}),
      hasPasswordHash: !!(storedUser && storedUser.passwordHash)
    })
    
  } catch (error: any) {
    console.error("[DEBUG/FIX-USERS] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}
