import type { QueryResult } from "pg"
import {
  ForexOrgMembership,
  ForexPermissionUser,
  resolveOrgId,
  resolveOrgName,
} from "@/lib/forex-permissions"

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function getOrgSnapshot(membership: ForexOrgMembership): Record<string, unknown> {
  return asRecord(membership.orgId)
}

export async function ensureForexOrgTables(client: Queryable) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS forex_organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_org_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(50),
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      org_snapshot JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS forex_org_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_external_id VARCHAR(255),
      external_org_id VARCHAR(255) NOT NULL REFERENCES forex_organizations(external_org_id) ON DELETE CASCADE,
      membership_external_id VARCHAR(255),
      role VARCHAR(100) NOT NULL,
      status VARCHAR(50),
      permissions JSONB DEFAULT '[]'::jsonb,
      membership_snapshot JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, external_org_id)
    )
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_external_org_id
      ON forex_org_memberships(external_org_id)
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_user_external_id
      ON forex_org_memberships(user_external_id)
  `)
}

export async function syncForexOrgMemberships(
  client: Queryable,
  localUserId: string,
  externalProfile: ForexPermissionUser & Record<string, unknown>,
) {
  const memberships = Array.isArray(externalProfile.orgMemberships)
    ? externalProfile.orgMemberships
    : []

  await ensureForexOrgTables(client)

  for (const membership of memberships) {
    const externalOrgId = resolveOrgId(membership.orgId)
    if (!externalOrgId) continue

    const orgSnapshot = getOrgSnapshot(membership)
    const name = resolveOrgName(membership.orgId) || externalOrgId
    const status = typeof orgSnapshot.status === "string" ? orgSnapshot.status : membership.status || null
    const stripeCustomerId =
      typeof orgSnapshot.stripeCustomerId === "string" ? orgSnapshot.stripeCustomerId : null
    const stripeSubscriptionId =
      typeof orgSnapshot.stripeSubscriptionId === "string" ? orgSnapshot.stripeSubscriptionId : null

    await client.query(
      `
        INSERT INTO forex_organizations (
          external_org_id,
          name,
          status,
          stripe_customer_id,
          stripe_subscription_id,
          org_snapshot,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
        ON CONFLICT (external_org_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          org_snapshot = EXCLUDED.org_snapshot,
          updated_at = NOW()
      `,
      [
        externalOrgId,
        name,
        status,
        stripeCustomerId,
        stripeSubscriptionId,
        JSON.stringify(orgSnapshot),
      ],
    )

    await client.query(
      `
        INSERT INTO forex_org_memberships (
          user_id,
          user_external_id,
          external_org_id,
          membership_external_id,
          role,
          status,
          permissions,
          membership_snapshot,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW())
        ON CONFLICT (user_id, external_org_id) DO UPDATE SET
          user_external_id = EXCLUDED.user_external_id,
          membership_external_id = EXCLUDED.membership_external_id,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          permissions = EXCLUDED.permissions,
          membership_snapshot = EXCLUDED.membership_snapshot,
          updated_at = NOW()
      `,
      [
        localUserId,
        typeof externalProfile.id === "string"
          ? externalProfile.id
          : typeof externalProfile._id === "string"
            ? externalProfile._id
            : null,
        externalOrgId,
        membership._id || membership.id || null,
        membership.role || "organization_user",
        membership.status || null,
        JSON.stringify(membership.permissions ?? []),
        JSON.stringify(membership),
      ],
    )
  }
}
