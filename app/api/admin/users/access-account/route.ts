import { NextRequest, NextResponse } from "next/server"
import { getIpAddress, logAdminAction, requireAdmin } from "@/lib/admin-utils"

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req)
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
    }

    await logAdminAction({
      adminUserId: adminUser.id,
      action: "access_account",
      resourceType: "user",
      resourceId: userId,
      metadata: { targetUserId: userId },
      ipAddress: getIpAddress(req)
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = error?.message || "Failed to log access account"
    if (message.includes("Forbidden") || message.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 })
    }

    console.error("❌ [ADMIN-ACCESS-ACCOUNT] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to log access account" }, { status: 500 })
  }
}
