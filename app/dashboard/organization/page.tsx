"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle2, ChevronDown, Mail, ShieldCheck, Users } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import {
  ForexOrgMembership,
  ForexPermission,
  resolveOrgId,
  resolveOrgName,
} from "@/lib/forex-permissions"
import {
  CALL_CENTER_ADMIN_PERMISSIONS,
  type CallCenterPermissions,
} from "@/lib/hustle-integration-schemas"

type OrganizationMember = {
  userId: string
  externalId?: string | null
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
  hustleRole?: string | null
  callCenterRole?: string | null
  status?: string | null
  permissions?: ForexPermission[] | Record<string, boolean>
}

type LocalOrganization = {
  external_org_id: string
  name: string
  status?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  members?: OrganizationMember[]
}

function formatRole(role?: string | null) {
  if (!role) return "Member"
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getPermissionLabel(permission: ForexPermission) {
  const platform = permission.platformId
  const platformName = typeof platform === "string" ? platform : platform?.name || platform?._id || "Platform"
  const access = permission.accessLevel?.join(", ") || "no access"
  return `${platformName}: ${access}`
}

function formatCallCenterPermissions(permissions: Record<string, boolean>) {
  return Object.entries(permissions)
    .filter(([, enabled]) => enabled)
    .map(([key]) =>
      key
        .replace(/^can/, "")
        .replace(/([A-Z])/g, " $1")
        .trim(),
    )
}

function isCallCenterPermissionMap(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return Object.values(value).some((entry) => typeof entry === "boolean")
}

function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase()
}

function isOrgAdminRole(role?: string | null) {
  const normalized = (role || "").trim().toLowerCase()
  return (
    normalized === "call_center_admin" ||
    normalized === "organization_admin" ||
    normalized === "call center admin" ||
    normalized === "organization admin"
  )
}

function findCurrentMember(
  members: OrganizationMember[] | undefined,
  user: { id?: string; email?: string | null } | null | undefined,
): OrganizationMember | null {
  if (!members?.length || !user) return null

  const byId = user.id ? members.find((member) => member.userId === user.id) : null
  if (byId) return byId

  const email = normalizeEmail(user.email)
  if (!email) return null

  return members.find((member) => normalizeEmail(member.email) === email) || null
}

function resolveCallCenterPermissions(
  member: OrganizationMember | null,
  tokenPermissions: ForexPermission[] | undefined,
): {
  roleLabel: string | null
  forexPermissions: ForexPermission[]
  callCenterPermissions: Record<string, boolean> | null
} {
  const role = member?.callCenterRole || member?.role || null
  const roleLabel = role ? formatRole(role) : null
  const memberPermissions = member?.permissions
  const isAdminRole =
    role === "call_center_admin" ||
    role === "organization_admin" ||
    role === "Call Center Admin" ||
    role === "Organization Admin"

  let callCenterPermissions: Record<string, boolean> | null = null

  if (isCallCenterPermissionMap(memberPermissions)) {
    const enabled = formatCallCenterPermissions(memberPermissions)
    callCenterPermissions =
      enabled.length > 0
        ? memberPermissions
        : isAdminRole
          ? CALL_CENTER_ADMIN_PERMISSIONS
          : memberPermissions
  } else if (isAdminRole) {
    callCenterPermissions = CALL_CENTER_ADMIN_PERMISSIONS
  }

  const forexPermissions =
    Array.isArray(tokenPermissions) && tokenPermissions.length > 0
      ? tokenPermissions
      : Array.isArray(memberPermissions)
        ? (memberPermissions as ForexPermission[])
        : []

  return { roleLabel, forexPermissions, callCenterPermissions }
}

function fallbackOrganizations(memberships: ForexOrgMembership[] = []): LocalOrganization[] {
  return memberships.reduce<LocalOrganization[]>((orgs, membership) => {
    const externalOrgId = resolveOrgId(membership.orgId)
    if (!externalOrgId) return orgs

    orgs.push({
        external_org_id: externalOrgId,
        name: resolveOrgName(membership.orgId) || externalOrgId,
        status: membership.status,
        members: [],
    })

    return orgs
  }, [])
}

export default function OrganizationPage() {
  const router = useRouter()
  const { user, loading, activeOrgMembership } = useAuth()
  const { workspace, switchWorkspace, exitWorkspace } = useWorkspace()
  const [organizations, setOrganizations] = useState<LocalOrganization[]>([])
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)

  const fallbackOrgs = useMemo(
    () => fallbackOrganizations(user?.orgMemberships ?? []),
    [user?.orgMemberships],
  )

  useEffect(() => {
    if (!user?.id) return

    const loadOrganizations = async () => {
      setIsLoadingOrganizations(true)
      setError(null)

      try {
        const response = await fetch("/api/organizations", {
          credentials: "include",
          cache: "no-store",
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || "Failed to load organizations")
        }

        setOrganizations(Array.isArray(data.organizations) ? data.organizations : [])
      } catch (err: any) {
        setError(err?.message || "Failed to load organizations")
        setOrganizations([])
      } finally {
        setIsLoadingOrganizations(false)
      }
    }

    loadOrganizations()
  }, [user?.id])

  const displayOrganizations = organizations.length > 0 ? organizations : fallbackOrgs
  const activeOrgId = user?.activeOrgId || null

  const handleSwitchWorkspace = async (orgId: string, orgName: string) => {
    setSwitchingOrgId(orgId)
    setError(null)
    try {
      const result = await switchWorkspace(orgId)
      if (!result.success) {
        const message = result.message || "Failed to switch workspace"
        setError(message)
        toast.error(message)
        return
      }
      toast.success(`Switched to ${orgName} workspace`)
      router.push("/dashboard")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to switch workspace"
      setError(message)
      toast.error(message)
    } finally {
      setSwitchingOrgId(null)
    }
  }

  const handleExitWorkspace = async () => {
    setSwitchingOrgId("exit")
    try {
      const result = await exitWorkspace()
      if (!result.success) {
        toast.error(result.message || "Failed to exit workspace")
        return
      }
      toast.success("Returned to personal workspace")
    } finally {
      setSwitchingOrgId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading organization...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Organization workspace
          </div>
          <h1 className="text-3xl font-bold text-foreground">My Organization</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Your organization access is based on the FOREX org memberships in your login token.
            Users are connected by the same organization id, not by sharing another user's personal account.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {workspace ? "Organization workspace" : activeOrgId ? "Organization" : "Personal"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {workspace
                  ? `${workspace.orgName}${workspace.adminEmail ? ` · admin ${workspace.adminEmail}` : ""}`
                  : activeOrgId
                    ? activeOrgMembership
                      ? resolveOrgName(activeOrgMembership.orgId) || activeOrgId
                      : activeOrgId
                    : "No organization is active in the token yet."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{displayOrganizations.length}</div>
              <p className="mt-1 text-sm text-muted-foreground">Synced from FOREX memberships</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatRole(user?.activeRole || user?.role)}</div>
              <p className="mt-1 text-sm text-muted-foreground">Current role from auth context</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}. Showing organizations from the current token instead.
          </div>
        )}

        {isLoadingOrganizations ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">Loading organization data...</CardContent>
          </Card>
        ) : displayOrganizations.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">No organization memberships found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This account is currently only using personal/client permissions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {displayOrganizations.map((org) => {
              const tokenMembership = user?.orgMemberships?.find(
                (membership) => resolveOrgId(membership.orgId) === org.external_org_id,
              )
              const currentMember = findCurrentMember(org.members, user)
              const isTokenActive = activeOrgId === org.external_org_id
              const isWorkspaceActive = workspace?.orgId === org.external_org_id
              const memberRole =
                currentMember?.callCenterRole || currentMember?.role || null
              const role =
                currentMember?.callCenterRole ||
                currentMember?.role ||
                tokenMembership?.role ||
                null
              const isOrgAdmin = isOrgAdminRole(memberRole) || isOrgAdminRole(role)
              const isSwitchingThisOrg = switchingOrgId === org.external_org_id
              // Operators/users can switch into admin workspace; admins already own it
              const showSwitchButton =
                Boolean(currentMember) &&
                !isOrgAdmin &&
                (memberRole || "").toLowerCase() !== "no_access"
              const { roleLabel, forexPermissions, callCenterPermissions } =
                resolveCallCenterPermissions(currentMember, tokenMembership?.permissions)
              const permissionLabels = callCenterPermissions
                ? formatCallCenterPermissions(callCenterPermissions as CallCenterPermissions)
                : []

              return (
                <Card key={org.external_org_id} className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-primary/10 p-3 text-primary">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle>{org.name}</CardTitle>
                          <CardDescription className="mt-1">
                            Org ID: {org.external_org_id}
                          </CardDescription>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={org.status === "active" ? "default" : "secondary"}>
                              {org.status || "unknown"}
                            </Badge>
                            <Badge variant="outline">{formatRole(role)}</Badge>
                            {isWorkspaceActive ? (
                              <Badge className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Current workspace
                              </Badge>
                            ) : isTokenActive ? (
                              <Badge variant="secondary">Token active org</Badge>
                            ) : (
                              <Badge variant="secondary">Available membership</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isWorkspaceActive ? (
                          <Button
                            variant="outline"
                            disabled={switchingOrgId === "exit" || isSwitchingThisOrg}
                            onClick={handleExitWorkspace}
                          >
                            {switchingOrgId === "exit" ? "Exiting..." : "Exit to personal"}
                          </Button>
                        ) : showSwitchButton ? (
                          <Button
                            variant="default"
                            disabled={isSwitchingThisOrg || switchingOrgId === "exit"}
                            onClick={() => handleSwitchWorkspace(org.external_org_id, org.name)}
                          >
                            {isSwitchingThisOrg ? "Switching..." : "Switch to workspace"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-6 p-6 lg:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center gap-2 font-semibold">
                        <Users className="h-4 w-4" />
                        Members synced in local DB
                      </div>
                      {org.members && org.members.length > 0 ? (
                        <div className="space-y-3">
                          {org.members.map((member) => (
                            <div
                              key={`${org.external_org_id}-${member.userId}`}
                              className="rounded-lg border p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">
                                    {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                                      member.email}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {member.email}
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {formatRole(member.callCenterRole || member.role)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                          No other members are synced locally yet. They will appear after they log in once.
                        </p>
                      )}
                    </div>

                    <div>
                      <Collapsible defaultOpen={false} className="rounded-lg border">
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 transition-colors [&[data-state=open]>svg]:rotate-180">
                          <div className="flex min-w-0 items-center gap-2 font-semibold">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <span>Your permissions in this org</span>
                            {roleLabel && (
                              <Badge variant="outline" className="font-normal">
                                {roleLabel}
                              </Badge>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t px-3 pb-3 pt-3">
                          {roleLabel || permissionLabels.length > 0 || forexPermissions.length > 0 ? (
                            <div className="space-y-2">
                              {roleLabel && (
                                <div className="rounded-lg border bg-card p-3">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Role
                                  </div>
                                  <div className="mt-1 text-sm font-medium">{roleLabel}</div>
                                </div>
                              )}
                              {permissionLabels.map((label) => (
                                <div key={label} className="rounded-lg border bg-card p-3 text-sm">
                                  {label}
                                </div>
                              ))}
                              {permissionLabels.length === 0 &&
                                forexPermissions.map((permission) => (
                                  <div
                                    key={permission._id || getPermissionLabel(permission)}
                                    className="rounded-lg border bg-card p-3 text-sm"
                                  >
                                    {getPermissionLabel(permission)}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                              No explicit org permissions were returned for your membership.
                            </p>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
