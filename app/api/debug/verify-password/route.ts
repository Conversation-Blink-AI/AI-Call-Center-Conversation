
import { NextResponse } from "next/server"
import { db } from "@/lib/replit-db-server"
import * as bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "Email and password are required" 
      }, { status: 400 })
    }

    console.log("[PASSWORD-DEBUG] Checking password for:", email)

    // Get user from database
    const userResult = await db.get(`user:${email}`)
    
    if (!userResult || userResult.error || userResult.ok === false) {
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 })
    }

    // Extract user data
    const user = userResult.user || userResult.value || userResult
    
    console.log("[PASSWORD-DEBUG] User found:", {
      email: user.email,
      hasPasswordHash: !!user.passwordHash,
      passwordHashPreview: user.passwordHash ? user.passwordHash.substring(0, 20) + "..." : "None"
    })

    // Test password against hash
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    
    console.log("[PASSWORD-DEBUG] Password validation:", {
      providedPassword: password,
      isValid: isValidPassword
    })

    // Also test against common test passwords
    const testPasswords = ["password123", "test123", "admin123"]
    const testResults = {}
    
    for (const testPass of testPasswords) {
      const isTestValid = await bcrypt.compare(testPass, user.passwordHash)
      testResults[testPass] = isTestValid
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        hasPasswordHash: !!user.passwordHash
      },
      passwordCheck: {
        providedPasswordValid: isValidPassword,
        testPasswordResults: testResults
      }
    })

  } catch (error: any) {
    console.error("[PASSWORD-DEBUG] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error",
      error: error.message 
    }, { status: 500 })
  }
}
