
import { NextResponse } from "next/server"
import { updateUserRecord } from "@/lib/init-replit-database"

export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json()
    
    if (!userId || !role) {
      return NextResponse.json({ 
        success: false, 
        message: "userId and role are required" 
      }, { status: 400 })
    }

    const result = await updateUserRecord(userId, { role })
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${userId} role updated to ${role}`,
      data: result
    })
    
  } catch (error: any) {
    console.error("[DEBUG/UPDATE-USER-ROLE] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}
