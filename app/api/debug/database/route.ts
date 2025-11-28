
import { NextResponse } from "next/server"
import { listAllKeys, getAllUsers } from "@/lib/replit-db-server"

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Prevent execution during build time
  if (!process.env.REPLIT_DB_URL && !process.env.DATABASE_URL) {
    return NextResponse.json({ 
      success: false, 
      message: "Database not configured" 
    }, { status: 503 })
  }

  try {
    const keys = await listAllKeys()
    const users = await getAllUsers()
    
    // Group keys by type
    const keysByType = {
      users: keys.filter(k => k.startsWith('user:')),
      userIds: keys.filter(k => k.startsWith('userId:')),
      pathways: keys.filter(k => k.startsWith('pathway:')),
      userPathways: keys.filter(k => k.startsWith('userPathways:')),
      phones: keys.filter(k => k.startsWith('phone:')),
      userPhones: keys.filter(k => k.startsWith('userPhones:')),
      calls: keys.filter(k => k.startsWith('call:')),
      userCalls: keys.filter(k => k.startsWith('userCalls:')),
      other: keys.filter(k => !k.match(/^(user:|userId:|pathway:|userPathways:|phone:|userPhones:|call:|userCalls:)/))
    }

    return NextResponse.json({
      success: true,
      totalKeys: keys.length,
      keysByType,
      users: users.length,
      usersList: users
    })
  } catch (error: any) {
    console.error("[DEBUG/DATABASE] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}
