
import { NextRequest, NextResponse } from "next/server"
import { validateAuthToken } from "@/lib/auth-utils"
import { CallCostService } from "@/services/call-cost-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [CALL-COSTS] Fetching call costs...")
    
    // Authenticate user
    const authResult = await validateAuthToken()
    if (!authResult.isValid || !authResult.user) {
      console.log("🚨 [CALL-COSTS] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = authResult.user.id
    console.log("✅ [CALL-COSTS] User authenticated:", userId)
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    
    // Fetch call costs
    const callCosts = await CallCostService.getCallCosts(userId, limit)
    
    console.log(`✅ [CALL-COSTS] Found ${callCosts.length} call costs for user ${userId}`)
    
    return NextResponse.json({
      success: true,
      callCosts,
      count: callCosts.length,
      userId
    })
    
  } catch (error: any) {
    console.error("❌ [CALL-COSTS] Error fetching call costs:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message 
    }, { status: 500 })
  }
}
