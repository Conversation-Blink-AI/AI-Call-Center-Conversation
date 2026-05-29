export type ForexAccessLevel = "view" | "edit" | string

export type ActiveRole = "client" | "organization_admin" | "organization_user" | string

export interface ForexPlatformRef {
  _id?: string
  id?: string
  name?: string
  status?: string
  [key: string]: unknown
}

export interface ForexPermission {
  platformId?: ForexPlatformRef | string | null
  accessLevel?: ForexAccessLevel[]
  _id?: string
  id?: string
  [key: string]: unknown
}

export interface ForexOrgMembership {
  orgId?: ForexPlatformRef | string | null
  role?: ActiveRole
  status?: string
  permissions?: ForexPermission[]
  _id?: string
  id?: string
  [key: string]: unknown
}

export interface ForexPermissionUser {
  role?: string | null
  permissions?: ForexPermission[] | null
  orgMemberships?: ForexOrgMembership[] | null
  activeOrgId?: string | null
  activeRole?: ActiveRole | null
}

export interface ForexAuthFields {
  permissions: ForexPermission[]
  orgMemberships: ForexOrgMembership[]
  activeOrgId: string | null
  activeRole: ActiveRole
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function normalizePermissionList(value: unknown): ForexPermission[] {
  return Array.isArray(value) ? (value as ForexPermission[]) : []
}

function normalizeOrgMembershipList(value: unknown): ForexOrgMembership[] {
  return Array.isArray(value) ? (value as ForexOrgMembership[]) : []
}

export function resolveOrgId(orgId: ForexOrgMembership["orgId"]): string | null {
  if (!orgId) return null
  if (typeof orgId === "string") return orgId
  return orgId._id || orgId.id || null
}

export function resolveOrgName(orgId: ForexOrgMembership["orgId"]): string | null {
  if (!orgId || typeof orgId === "string") return null
  return orgId.name || null
}

export function resolvePlatformValues(permission: ForexPermission): string[] {
  const platform = permission.platformId
  if (!platform) return []
  if (typeof platform === "string") return [platform]

  return [platform._id, platform.id, platform.name]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
}

export function extractForexAuthFields(source: unknown, fallbackRole: string = "client"): ForexAuthFields {
  const data = asRecord(source)
  const role = typeof data.role === "string" ? data.role : fallbackRole
  const activeRole = typeof data.activeRole === "string" ? data.activeRole : role
  const activeOrgId = typeof data.activeOrgId === "string" ? data.activeOrgId : null

  return {
    permissions: normalizePermissionList(data.permissions),
    orgMemberships: normalizeOrgMembershipList(data.orgMemberships),
    activeOrgId,
    activeRole,
  }
}

export function getActiveOrgMembership(user: ForexPermissionUser | null | undefined): ForexOrgMembership | null {
  if (!user?.activeOrgId) return null

  const membership = user.orgMemberships?.find((item) => resolveOrgId(item.orgId) === user.activeOrgId)
  if (!membership || membership.status !== "active") return null

  return membership
}

export function resolveEffectivePermissions(user: ForexPermissionUser | null | undefined): ForexPermission[] {
  if (!user) return []

  const activeRole = user.activeRole || user.role || "client"

  if (activeRole === "client") {
    return user.permissions ?? []
  }

  if (activeRole === "organization_admin" || activeRole === "organization_user") {
    return getActiveOrgMembership(user)?.permissions ?? []
  }

  return user.permissions ?? []
}

export function canAccessPlatform(
  user: ForexPermissionUser | null | undefined,
  platformNameOrId: string,
  accessLevel: ForexAccessLevel,
): boolean {
  const normalizedPlatform = platformNameOrId.toLowerCase()

  return resolveEffectivePermissions(user).some((permission) => {
    const hasPlatform = resolvePlatformValues(permission).some(
      (value) => value.toLowerCase() === normalizedPlatform,
    )
    const hasAccess = permission.accessLevel?.includes(accessLevel) ?? false

    return hasPlatform && hasAccess
  })
}
