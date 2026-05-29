"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, CheckCircle2, Mail, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import {
  ForexOrgMembership,
  ForexPermission,
  resolveOrgId,
  resolveOrgName,
} from "@/lib/forex-permissions"

type OrganizationMember = {
  userId: string
  externalId?: string | null
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
  status?: string | null
  permissions?: ForexPermission[]
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
  const { user, loading, activeOrgMembership } = useAuth()
  const [organizations, setOrganizations] = useState<LocalOrganization[]>([])
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                {activeOrgId ? "Organization" : "Personal"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeOrgId
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
              const isActive = activeOrgId === org.external_org_id
              const role = tokenMembership?.role || org.members?.find((member) => member.email === user?.email)?.role
              const permissions = tokenMembership?.permissions ?? []

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
                            {isActive ? (
                              <Badge className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Current workspace
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Available membership</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant={isActive ? "default" : "outline"} disabled={!isActive}>
                        {isActive ? "Manage Organization" : "Switch endpoint required"}
                      </Button>
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
                                <Badge variant="outline">{formatRole(member.role)}</Badge>
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
                      <div className="mb-3 flex items-center gap-2 font-semibold">
                        <ShieldCheck className="h-4 w-4" />
                        Your permissions in this org
                      </div>
                      {permissions.length > 0 ? (
                        <div className="space-y-2">
                          {permissions.map((permission) => (
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
