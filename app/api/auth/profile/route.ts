import { NextResponse } from "next/server"
import { db } from "@/lib/replit-db-server"
import * as jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function PUT(request: Request) {
  try {
    // Get token from cookies
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: "Not authenticated" 
      }, { status: 401 })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Get current user from database
    const user = await db.get(`user:${decoded.email}`)
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 })
    }

    // Get update data
    const { firstName, lastName, company, phoneNumber } = await request.json()

    // Update user data
    const updatedUser = {
      ...user,
      first_name: firstName,
      last_name: lastName,
      company: company,
      phone_number: phoneNumber,
      updatedAt: new Date().toISOString()
    }

    // Save updated user
    await db.set(`user:${decoded.email}`, updatedUser)

    console.log("[AUTH/PROFILE] Profile updated for:", decoded.email)

    // Return success
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        company: updatedUser.company,
        phoneNumber: updatedUser.phone_number,
        role: updatedUser.role
      }
    })

  } catch (error: any) {
    console.error("[AUTH/PROFILE] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Profile update failed" 
    }, { status: 500 })
  }
}