import type { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { Pool } from "pg"
import { getPool } from "@/lib/db-client"
import {
  resolveOrgAdminUserId,
  verifyOrgMembership,
  type OrgAdminWalletOwner,
  type OrgMembershipRow,
  type PublicApiUser,
} from "@/lib/public-api-verify"

export const WORKSPACE_COOKIE_NAME = "cc-workspace-org-id"

export type WorkspaceSummary = {
  orgId: string
  orgName: string
  adminEmail: string | null
  adminUserId: string
  adminSource: OrgAdminWalletOwner["source"]
  callCenterRole: string | null
  membershipRole: string | null
}

export type DashboardResourceOwner =
  | {
      mode: "self"
      userId: string
      orgId: null
      adminEmail: null
    }
  | {
      mode: "organization_admin"
      userId: string
      orgId: string
      orgName: string
      adminEmail: string | null
      adminSource: OrgAdminWalletOwner["source"]
      callCenterRole: string | null
      membershipRole: string | null
    }

type AuthUserLike = {
  id: string
  email?: string | null
  first_name?: string | null
  firstName?: string | null
  last_name?: string | null
  lastName?: string | null
  external_id?: string | null
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

export function toPublicApiUser(user: AuthUserLike): PublicApiUser {
  return {
    id: user.id,
    email: (user.email || "").trim().toLowerCase(),
    first_name: user.first_name ?? user.firstName ?? null,
    last_name: user.last_name ?? user.lastName ?? null,
    external_id: user.external_id ?? null,
  }
}

export function getWorkspaceOrgIdFromRequest(request: NextRequest): string | null {
  const value = request.cookies.get(WORKSPACE_COOKIE_NAME)?.value
  return value && value.trim() ? value.trim() : null
}

export async function getWorkspaceOrgIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(WORKSPACE_COOKIE_NAME)?.value
  return value && value.trim() ? value.trim() : null
}

export function setWorkspaceOrgIdOnResponse(response: NextResponse, orgId: string) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, orgId, cookieOptions(60 * 60 * 24 * 30))
}

export function clearWorkspaceOrgIdOnResponse(response: NextResponse) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, "", cookieOptions(0))
}

export async function clearWorkspaceOrgIdFromCookies() {
  const cookieStore = await cookies()
  cookieStore.set(WORKSPACE_COOKIE_NAME, "", cookieOptions(0))
  cookieStore.delete(WORKSPACE_COOKIE_NAME)
}

function membershipRole(membership: OrgMembershipRow): string | null {
  return membership.call_center_role || membership.role || null
}

export function isNoAccessRole(role: string | null | undefined): boolean {
  return (role || "").trim().toLowerCase() === "no_access"
}

export async function loadWorkspaceSummary(
  pool: Pool,
  orgId: string,
  membership: OrgMembershipRow,
  admin: OrgAdminWalletOwner,
): Promise<WorkspaceSummary> {
  const orgResult = await pool.query(
    `SELECT name FROM forex_organizations WHERE external_org_id = $1 LIMIT 1`,
    [orgId],
  )

  return {
    orgId,
    orgName: orgResult.rows[0]?.name || orgId,
    adminEmail: admin.email,
    adminUserId: admin.userId,
    adminSource: admin.source,
    callCenterRole: membership.call_center_role || null,
    membershipRole: membershipRole(membership),
  }
}

/**
 * Switch into an org workspace: verify membership, reject no_access, resolve admin.
 */
export async function switchToWorkspace(
  pool: Pool,
  authUser: AuthUserLike,
  orgId: string,
): Promise<{ summary: WorkspaceSummary } | { error: { status: number; message: string } }> {
  const requester = toPublicApiUser(authUser)
  if (!requester.email) {
    return { error: { status: 400, message: "Authenticated user email is required" } }
  }

  const membershipResult = await verifyOrgMembership(pool, orgId, requester)
  if ("error" in membershipResult) {
    return { error: membershipResult.error }
  }

  const role = membershipRole(membershipResult.membership)
  if (isNoAccessRole(role)) {
    return {
      error: {
        status: 403,
        message: "Your membership does not allow switching into this workspace",
      },
    }
  }

  const admin = await resolveOrgAdminUserId(pool, orgId)
  if (!admin) {
    return {
      error: {
        status: 404,
        message:
          "Organization admin not found. Ensure the org has an owner or Call Center Admin membership.",
      },
    }
  }

  const summary = await loadWorkspaceSummary(pool, orgId, membershipResult.membership, admin)
  return { summary }
}

/**
 * Resolve which local user_id owns wallet/phone resources for this request.
 * Invalid workspace cookie falls back to personal (self) mode.
 */
export async function resolveDashboardResourceOwner(
  authUser: AuthUserLike,
  workspaceOrgId?: string | null,
  pool: Pool = getPool(),
): Promise<DashboardResourceOwner> {
  const orgId = workspaceOrgId?.trim() || null

  if (!orgId) {
    return {
      mode: "self",
      userId: authUser.id,
      orgId: null,
      adminEmail: null,
    }
  }

  const requester = toPublicApiUser(authUser)
  if (!requester.email) {
    return {
      mode: "self",
      userId: authUser.id,
      orgId: null,
      adminEmail: null,
    }
  }

  try {
    const membershipResult = await verifyOrgMembership(pool, orgId, requester)
    if ("error" in membershipResult) {
      return {
        mode: "self",
        userId: authUser.id,
        orgId: null,
        adminEmail: null,
      }
    }

    const role = membershipRole(membershipResult.membership)
    if (isNoAccessRole(role)) {
      return {
        mode: "self",
        userId: authUser.id,
        orgId: null,
        adminEmail: null,
      }
    }

    const admin = await resolveOrgAdminUserId(pool, orgId)
    if (!admin) {
      return {
        mode: "self",
        userId: authUser.id,
        orgId: null,
        adminEmail: null,
      }
    }

    const orgResult = await pool.query(
      `SELECT name FROM forex_organizations WHERE external_org_id = $1 LIMIT 1`,
      [orgId],
    )

    return {
      mode: "organization_admin",
      userId: admin.userId,
      orgId,
      orgName: orgResult.rows[0]?.name || orgId,
      adminEmail: admin.email,
      adminSource: admin.source,
      callCenterRole: membershipResult.membership.call_center_role || null,
      membershipRole: role,
    }
  } catch (error) {
    console.error("[WORKSPACE] Failed to resolve dashboard resource owner:", error)
    return {
      mode: "self",
      userId: authUser.id,
      orgId: null,
      adminEmail: null,
    }
  }
}

export async function getCurrentWorkspaceSummary(
  authUser: AuthUserLike,
  workspaceOrgId?: string | null,
  pool: Pool = getPool(),
): Promise<WorkspaceSummary | null> {
  const owner = await resolveDashboardResourceOwner(authUser, workspaceOrgId, pool)
  if (owner.mode !== "organization_admin") {
    return null
  }

  return {
    orgId: owner.orgId,
    orgName: owner.orgName,
    adminEmail: owner.adminEmail,
    adminUserId: owner.userId,
    adminSource: owner.adminSource,
    callCenterRole: owner.callCenterRole,
    membershipRole: owner.membershipRole,
  }
}
