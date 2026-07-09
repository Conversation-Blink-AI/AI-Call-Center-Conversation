import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIGRATION_BASE = "/api/v1/integrations/hustle"

export async function GET() {
  return NextResponse.json({
    status: "deprecated",
    message: "This endpoint has been replaced by Hustle integration routes",
    replacements: {
      orgSync: `${MIGRATION_BASE}/org-sync`,
      memberSync: `${MIGRATION_BASE}/member-sync`,
      permissionSync: `${MIGRATION_BASE}/permission-sync`,
    },
    auth: {
      bearer: "Authorization: Bearer <SUBSCRIPTION_INTERNAL_API_TOKEN>",
      hmac: "X-Hustle-Timestamp + X-Hustle-Signature (optional)",
    },
  })
}

export async function POST() {
  return NextResponse.json(
    {
      status: "gone",
      message: "POST /api/webhooks/forex/organization is deprecated",
      replacements: {
        orgSync: `${MIGRATION_BASE}/org-sync`,
        memberSync: `${MIGRATION_BASE}/member-sync`,
        permissionSync: `${MIGRATION_BASE}/permission-sync`,
      },
    },
    { status: 410 },
  )
}
