import type { CallCenterPermissions } from "@/lib/hustle-integration-schemas"

export type OrgMembershipPermissionRow = {
  permissions?: unknown
  call_center_role?: string | null
  role?: string | null
}

function asPermissionObject(value: unknown): Partial<CallCenterPermissions> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Partial<CallCenterPermissions>
}

function getPermission(
  membership: OrgMembershipPermissionRow,
  key: keyof CallCenterPermissions,
): boolean {
  const permissions = asPermissionObject(membership.permissions)
  return permissions[key] === true
}

export function isCallCenterAdmin(membership: OrgMembershipPermissionRow): boolean {
  const role = membership.call_center_role || membership.role
  return role === "call_center_admin"
}

export function canViewWallet(membership: OrgMembershipPermissionRow): boolean {
  return isCallCenterAdmin(membership) || getPermission(membership, "canViewWallet")
}

export function canViewOrgAnalytics(membership: OrgMembershipPermissionRow): boolean {
  return isCallCenterAdmin(membership) || getPermission(membership, "canViewOrgAnalytics")
}

export function canViewOwnCallLogs(membership: OrgMembershipPermissionRow): boolean {
  return isCallCenterAdmin(membership) || getPermission(membership, "canViewOwnCallLogs")
}

export function canViewAllCallLogs(membership: OrgMembershipPermissionRow): boolean {
  return isCallCenterAdmin(membership) || getPermission(membership, "canViewAllCallLogs")
}

export type AnalyticsScope = "organization" | "self"

export function resolveAnalyticsScope(membership: OrgMembershipPermissionRow): AnalyticsScope | null {
  if (canViewOrgAnalytics(membership) || canViewAllCallLogs(membership)) {
    return "organization"
  }
  if (canViewOwnCallLogs(membership)) {
    return "self"
  }
  return null
}
