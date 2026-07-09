import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"
import { getUserFromRequest } from "@/lib/auth-utils"
import { ensureForexOrgTables } from "@/lib/forex-org-sync"

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
  })

  try {
    await client.connect()
    await ensureForexOrgTables(client)

    const result = await client.query(
      `
        WITH my_orgs AS (
          SELECT external_org_id
          FROM forex_org_memberships
          WHERE user_id = $1
        )
        SELECT
          o.external_org_id,
          o.name,
          o.status,
          o.stripe_customer_id,
          o.stripe_subscription_id,
          o.org_snapshot,
          COALESCE(
            json_agg(
              json_build_object(
                'userId', u.id,
                'externalId', COALESCE(u.external_id, m.user_external_id),
                'email', COALESCE(u.email, m.user_email),
                'firstName', u.first_name,
                'lastName', u.last_name,
                'role', m.role,
                'hustleRole', m.hustle_role,
                'callCenterRole', m.call_center_role,
                'status', m.status,
                'permissions', m.permissions
              )
              ORDER BY
                CASE COALESCE(m.call_center_role, m.role)
                  WHEN 'call_center_admin' THEN 1
                  WHEN 'organization_admin' THEN 2
                  WHEN 'call_center_operator' THEN 3
                  WHEN 'organization_user' THEN 4
                  ELSE 5
                END,
                COALESCE(u.email, m.user_email)
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) AS members
        FROM forex_organizations o
        JOIN my_orgs mo ON mo.external_org_id = o.external_org_id
        LEFT JOIN forex_org_memberships m ON m.external_org_id = o.external_org_id
        LEFT JOIN users u ON u.id = m.user_id
        GROUP BY o.external_org_id, o.name, o.status, o.stripe_customer_id, o.stripe_subscription_id, o.org_snapshot
        ORDER BY o.name
      `,
      [user.id],
    )

    return NextResponse.json({ organizations: result.rows })
  } catch (error) {
    console.error("[ORGANIZATIONS] Failed to load organizations:", error)
    return NextResponse.json({ error: "Failed to load organizations" }, { status: 500 })
  } finally {
    await client.end().catch(() => {})
  }
}
