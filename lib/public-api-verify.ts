import type { Pool } from "pg"
import { decryptString } from "@/lib/encryption"
import { normalizeEmail } from "@/lib/utils"
import {
  canViewOrgAnalytics,
  isCallCenterAdmin,
  resolveAnalyticsScope,
  type AnalyticsScope,
  type OrgMembershipPermissionRow,
} from "@/lib/call-center-permissions"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type PublicApiUser = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  external_id: string | null
}

export type OrgMembershipRow = OrgMembershipPermissionRow & {
  id: string
  external_org_id: string
  user_id: string | null
  user_external_id: string | null
  user_email: string | null
  status: string | null
  hustle_role: string | null
  call_center_role: string | null
  role: string | null
}

export type PublicApiVerifyError = {
  status: number
  message: string
}

function decryptMaybe(plainValue: string | null, encryptedValue: string | null) {
  if (encryptedValue) {
    try {
      return decryptString(encryptedValue)
    } catch {
      // fall through
    }
  }
  return plainValue || ""
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

export async function verifyPublicApiUser(
  pool: Pool,
  emailParam: string,
  userIdParam: string,
): Promise<{ user: PublicApiUser } | { error: PublicApiVerifyError }> {
  if (!emailParam || !userIdParam) {
    return { error: { status: 400, message: "email and userId are required" } }
  }

  if (!isValidUuid(userIdParam)) {
    return { error: { status: 400, message: "userId must be a valid UUID" } }
  }

  const normalizedEmail = normalizeEmail(emailParam)
  const userResult = await pool.query(
    `SELECT id, email, email_enc, first_name, last_name, external_id
     FROM users
     WHERE id = $1::uuid
     LIMIT 1`,
    [userIdParam],
  )

  if (userResult.rows.length === 0) {
    return { error: { status: 404, message: "User not found" } }
  }

  const row = userResult.rows[0]
  const storedEmail = normalizeEmail(decryptMaybe(row.email, row.email_enc))

  if (storedEmail !== normalizedEmail) {
    return { error: { status: 404, message: "Email and userId could not be verified" } }
  }

  return {
    user: {
      id: row.id,
      email: storedEmail,
      first_name: row.first_name,
      last_name: row.last_name,
      external_id: row.external_id,
    },
  }
}

export async function verifyOrgMembership(
  pool: Pool,
  orgId: string,
  user: PublicApiUser,
): Promise<{ membership: OrgMembershipRow } | { error: PublicApiVerifyError }> {
  if (!orgId) {
    return { error: { status: 400, message: "orgId is required" } }
  }

  const orgResult = await pool.query(
    `SELECT external_org_id FROM forex_organizations WHERE external_org_id = $1 LIMIT 1`,
    [orgId],
  )

  if (orgResult.rows.length === 0) {
    return {
      error: {
        status: 404,
        message:
          "Organization not found. Ensure Hustle org-sync has run for this orgId.",
      },
    }
  }

  const normalizedEmail = normalizeEmail(user.email)
  const membershipResult = await pool.query(
    `SELECT
       id,
       external_org_id,
       user_id,
       user_external_id,
       user_email,
       status,
       role,
       hustle_role,
       call_center_role,
       permissions
     FROM forex_org_memberships
     WHERE external_org_id = $1
       AND (
         user_id = $2::uuid
         OR ($3::text IS NOT NULL AND user_external_id = $3::text)
         OR user_external_id = $2::text
         OR LOWER(TRIM(user_email)) = $4
       )
     ORDER BY
       CASE
         WHEN user_id = $2::uuid THEN 0
         WHEN ($3::text IS NOT NULL AND user_external_id = $3::text) THEN 1
         WHEN user_external_id = $2::text THEN 2
         ELSE 3
       END
     LIMIT 1`,
    [orgId, user.id, user.external_id, normalizedEmail],
  )

  if (membershipResult.rows.length === 0) {
    return {
      error: {
        status: 404,
        message:
          "Organization membership not found. Ensure Hustle member-sync has linked this user to the org.",
      },
    }
  }

  const membership = membershipResult.rows[0] as OrgMembershipRow

  if (membership.status !== "active") {
    return { error: { status: 404, message: "Organization membership is not active" } }
  }

  if (!membership.user_id) {
    await pool.query(
      `UPDATE forex_org_memberships
       SET user_id = $1::uuid, updated_at = NOW()
       WHERE id = $2`,
      [user.id, membership.id],
    )
    membership.user_id = user.id
  }

  return { membership }
}

export type OrgAdminWalletOwner = {
  userId: string
  email: string | null
  externalId: string | null
  source: "owner" | "organization_admin" | "call_center_admin"
}

/**
 * Resolve the organization admin whose personal wallet represents the org wallet.
 * Prefer forex_organizations.owner_external_user_id, then active membership with
 * organization_admin / call_center_admin role.
 */
export async function resolveOrgAdminUserId(
  pool: Pool,
  orgId: string,
): Promise<OrgAdminWalletOwner | null> {
  const orgResult = await pool.query(
    `SELECT owner_external_user_id, owner_email
     FROM forex_organizations
     WHERE external_org_id = $1
     LIMIT 1`,
    [orgId],
  )

  if (orgResult.rows.length === 0) {
    return null
  }

  const ownerExternalId = orgResult.rows[0].owner_external_user_id as string | null
  const ownerEmail = orgResult.rows[0].owner_email as string | null

  if (ownerExternalId) {
    const byExternal = await pool.query(
      `SELECT id, email, email_enc, external_id
       FROM users
       WHERE external_id = $1
       LIMIT 1`,
      [ownerExternalId],
    )
    if (byExternal.rows.length > 0) {
      const row = byExternal.rows[0]
      return {
        userId: row.id,
        email: normalizeEmail(decryptMaybe(row.email, row.email_enc)) || ownerEmail,
        externalId: row.external_id,
        source: "owner",
      }
    }

    const byMembership = await pool.query(
      `SELECT m.user_id, m.user_email, m.user_external_id, u.email, u.email_enc
       FROM forex_org_memberships m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.external_org_id = $1
         AND m.user_external_id = $2
         AND m.status = 'active'
         AND m.user_id IS NOT NULL
       LIMIT 1`,
      [orgId, ownerExternalId],
    )
    if (byMembership.rows.length > 0) {
      const row = byMembership.rows[0]
      const email =
        normalizeEmail(decryptMaybe(row.email, row.email_enc)) ||
        (row.user_email ? normalizeEmail(row.user_email) : null) ||
        (ownerEmail ? normalizeEmail(ownerEmail) : null)
      return {
        userId: row.user_id,
        email,
        externalId: row.user_external_id,
        source: "owner",
      }
    }
  }

  const adminMembership = await pool.query(
    `SELECT
       m.user_id,
       m.user_email,
       m.user_external_id,
       m.role,
       m.call_center_role,
       u.email,
       u.email_enc,
       u.external_id
     FROM forex_org_memberships m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.external_org_id = $1
       AND m.status = 'active'
       AND m.user_id IS NOT NULL
       AND (
         COALESCE(m.call_center_role, m.role) = 'organization_admin'
         OR COALESCE(m.call_center_role, m.role) = 'call_center_admin'
       )
     ORDER BY
       CASE COALESCE(m.call_center_role, m.role)
         WHEN 'organization_admin' THEN 0
         WHEN 'call_center_admin' THEN 1
         ELSE 2
       END,
       m.updated_at DESC NULLS LAST
     LIMIT 1`,
    [orgId],
  )

  if (adminMembership.rows.length === 0) {
    return null
  }

  const row = adminMembership.rows[0]
  const role = (row.call_center_role || row.role) as string
  const email =
    normalizeEmail(decryptMaybe(row.email, row.email_enc)) ||
    (row.user_email ? normalizeEmail(row.user_email) : null)

  return {
    userId: row.user_id,
    email,
    externalId: row.external_id || row.user_external_id,
    source: role === "call_center_admin" ? "call_center_admin" : "organization_admin",
  }
}

export async function resolveOrgScopedUserIds(
  pool: Pool,
  orgId: string,
  membership: OrgMembershipRow,
  requesterUserId: string,
  scope: AnalyticsScope,
): Promise<string[]> {
  if (scope === "self") {
    return [requesterUserId]
  }

  const result = await pool.query(
    `SELECT user_id
     FROM forex_org_memberships
     WHERE external_org_id = $1
       AND status = 'active'
       AND user_id IS NOT NULL`,
    [orgId],
  )

  const userIds = result.rows
    .map((row) => row.user_id as string)
    .filter(Boolean)

  if (userIds.length === 0 && (canViewOrgAnalytics(membership) || isCallCenterAdmin(membership))) {
    return [requesterUserId]
  }

  return userIds.length > 0 ? userIds : [requesterUserId]
}

export function resolveScopeFromMembership(
  membership: OrgMembershipRow,
): AnalyticsScope | null {
  return resolveAnalyticsScope(membership)
}
