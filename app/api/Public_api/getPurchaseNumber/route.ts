import { NextRequest } from "next/server"
import { getPool } from "@/lib/db-client"
import { ensureForexOrgTables } from "@/lib/forex-org-sync"
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/lib/public-api-cors"
import {
  resolveOrgAdminContext,
  verifyPublicApiUser,
} from "@/lib/public-api-verify"

type PhoneNumberRow = {
  pn_id: string
  number: string | null
  location: string | null
  area_code: string | null
  country_code: string | null
  purchased_at: string | null
  pn_user_id: string | null
  monthly_fee: string | number | null
  status: string | null
  type: string | null
}

function mapPhoneNumbers(rows: PhoneNumberRow[]) {
  return rows
    .filter((row) => row.pn_id != null)
    .map((row) => ({
      id: row.pn_id,
      number: row.number ? String(row.number).trim() : "",
      status: row.status || "active",
      location: row.location || "Unknown",
      area_code: row.area_code || null,
      country_code: row.country_code || null,
      type: row.type || "Local",
      purchased_at: row.purchased_at,
      user_id: row.pn_user_id,
      monthly_fee: row.monthly_fee != null ? parseFloat(String(row.monthly_fee)) : 15,
      pathway_id: null,
      pathway_name: null,
    }))
}

async function loadUserPhoneNumbers(pool: ReturnType<typeof getPool>, userId: string) {
  const result = await pool.query(
    `SELECT
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.email,
      pn.id as pn_id,
      pn.phone_number as number,
      pn.location,
      pn.area_code,
      pn.country_code,
      pn.purchased_at,
      pn.user_id as pn_user_id,
      pn.monthly_fee,
      pn.status,
      pn.type
     FROM users u
     LEFT JOIN phone_numbers pn ON pn.user_id = u.id
     WHERE u.id = $1::uuid
     ORDER BY pn.purchased_at DESC NULLS LAST`,
    [userId],
  )
  return result.rows
}

export async function OPTIONS(_request: NextRequest) {
  return publicApiOptionsResponse()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")
    const userIdParam = searchParams.get("userId")?.trim() || null
    const orgIdParam = searchParams.get("orgId")?.trim() || null

    if (!emailParam) {
      return publicApiJsonResponse(
        { success: false, message: "Email parameter is required" },
        400,
      )
    }

    if (!process.env.DATABASE_URL) {
      console.error("[GET-PURCHASE-NUMBER] DATABASE_URL is not set")
      return publicApiJsonResponse(
        { success: false, message: "Database configuration error" },
        500,
      )
    }

    const pool = getPool()

    // Org mode: any active member → organization_admin's purchased numbers
    if (orgIdParam) {
      if (!userIdParam) {
        return publicApiJsonResponse(
          {
            success: false,
            message: "userId is required when orgId is provided",
          },
          400,
        )
      }

      await ensureForexOrgTables(pool)

      const userResult = await verifyPublicApiUser(pool, emailParam, userIdParam)
      if ("error" in userResult) {
        return publicApiJsonResponse(
          { success: false, message: userResult.error.message, phoneNumbers: [], count: 0 },
          userResult.error.status,
        )
      }

      const orgContext = await resolveOrgAdminContext(pool, orgIdParam, userResult.user)
      if ("error" in orgContext) {
        return publicApiJsonResponse(
          { success: false, message: orgContext.error.message, phoneNumbers: [], count: 0 },
          orgContext.error.status,
        )
      }

      const rows = await loadUserPhoneNumbers(pool, orgContext.admin.userId)
      if (rows.length === 0 || rows[0].user_id == null) {
        return publicApiJsonResponse({
          success: false,
          message: "Organization admin user not found",
          orgId: orgIdParam,
          email: userResult.user.email,
          userId: userResult.user.id,
          phoneNumbers: [],
          count: 0,
        })
      }

      const adminUser = rows[0]
      const phoneNumbers = mapPhoneNumbers(rows)

      return publicApiJsonResponse({
        success: true,
        orgId: orgIdParam,
        email: userResult.user.email,
        userId: userResult.user.id,
        first_name: adminUser.first_name || "",
        last_name: adminUser.last_name || "",
        user_name:
          `${adminUser.first_name || ""} ${adminUser.last_name || ""}`.trim() || "User",
        phoneNumbers,
        count: phoneNumbers.length,
        scopedTo: "organization_admin",
        numbersOwnerUserId: orgContext.admin.userId,
        numbersOwnerEmail: orgContext.admin.email,
        numbersOwnerSource: orgContext.admin.source,
        requesterRole:
          orgContext.membership.call_center_role || orgContext.membership.role,
      })
    }

    // Personal mode: email only (existing behavior)
    console.log(`[GET-PURCHASE-NUMBER] Looking up phone numbers for email: ${emailParam}`)

    const result = await pool.query(
      `SELECT
        u.id as user_id,
        u.first_name,
        u.last_name,
        pn.id as pn_id,
        pn.phone_number as number,
        pn.location,
        pn.area_code,
        pn.country_code,
        pn.purchased_at,
        pn.user_id as pn_user_id,
        pn.monthly_fee,
        pn.status,
        pn.type
       FROM users u
       LEFT JOIN phone_numbers pn ON pn.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)
       ORDER BY pn.purchased_at DESC NULLS LAST`,
      [emailParam.trim()],
    )

    const rows = result.rows
    if (rows.length === 0 || rows[0].user_id == null) {
      console.log(`[GET-PURCHASE-NUMBER] User not found for email: ${emailParam}`)
      return publicApiJsonResponse({
        success: false,
        message: "User not found",
        email: emailParam,
        phoneNumbers: [],
        count: 0,
      })
    }

    const user = rows[0]
    const phoneNumbers = mapPhoneNumbers(rows)

    console.log(
      `[GET-PURCHASE-NUMBER] Found ${phoneNumbers.length} phone numbers for user ${user.user_id}`,
    )

    return publicApiJsonResponse({
      success: true,
      orgId: null,
      userId: user.user_id,
      email: emailParam,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      user_name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User",
      phoneNumbers,
      count: phoneNumbers.length,
      scopedTo: "self",
      numbersOwnerUserId: user.user_id,
      numbersOwnerEmail: emailParam,
    })
  } catch (error: unknown) {
    console.error("[GET-PURCHASE-NUMBER] Error:", error)
    const err = error as { message?: string }
    return publicApiJsonResponse(
      {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && err?.message
          ? { error: err.message }
          : {}),
      },
      500,
    )
  }
}
