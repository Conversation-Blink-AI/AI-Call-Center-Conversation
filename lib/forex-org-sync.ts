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

export type ForexOrganizationWebhookPayload = Record<string, unknown>

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function getOrgSnapshot(membership: ForexOrgMembership): Record<string, unknown> {
  return asRecord(membership.orgId)
}

function unwrapMongoValue(value: unknown): unknown {
  const record = asRecord(value)

  if (typeof record.$oid === "string") return record.$oid
  if (typeof record.$date === "string") return record.$date

  return value
}

function getString(value: unknown): string | null {
  const unwrapped = unwrapMongoValue(value)
  return typeof unwrapped === "string" && unwrapped.length > 0 ? unwrapped : null
}

function getDate(value: unknown): string | null {
  return getString(value)
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function getOrgUsers(payload: ForexOrganizationWebhookPayload): Record<string, unknown>[] {
  const orgUsers = payload.org_users || payload.orgUsers
  return Array.isArray(orgUsers)
    ? orgUsers.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : []
}

export async function ensureForexOrgTables(client: Queryable) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS forex_organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_org_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      nickname VARCHAR(255),
      status VARCHAR(50),
      owner_external_user_id VARCHAR(255),
      owner_email VARCHAR(255),
      coi_file_url TEXT,
      contract_file_url TEXT,
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      stripe_plan_status VARCHAR(50),
      org_plan_id VARCHAR(255),
      active_price_ids JSONB DEFAULT '[]'::jsonb,
      service_statuses JSONB DEFAULT '{}'::jsonb,
      service_period_ends JSONB DEFAULT '{}'::jsonb,
      subscription_period_end TIMESTAMP WITH TIME ZONE,
      org_snapshot JSONB DEFAULT '{}'::jsonb,
      last_webhook_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS forex_org_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      user_external_id VARCHAR(255),
      user_email VARCHAR(255),
      external_org_id VARCHAR(255) NOT NULL REFERENCES forex_organizations(external_org_id) ON DELETE CASCADE,
      membership_external_id VARCHAR(255),
      role VARCHAR(100) NOT NULL,
      status VARCHAR(50),
      permissions JSONB DEFAULT '[]'::jsonb,
      membership_snapshot JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(external_org_id, user_external_id)
    )
  `)

  await client.query(`
    ALTER TABLE forex_organizations
      ADD COLUMN IF NOT EXISTS nickname VARCHAR(255),
      ADD COLUMN IF NOT EXISTS owner_external_user_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS coi_file_url TEXT,
      ADD COLUMN IF NOT EXISTS contract_file_url TEXT,
      ADD COLUMN IF NOT EXISTS stripe_plan_status VARCHAR(50),
      ADD COLUMN IF NOT EXISTS org_plan_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS active_price_ids JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS service_statuses JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS service_period_ends JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMP WITH TIME ZONE
  `)

  await client.query(`
    ALTER TABLE forex_org_memberships
      ALTER COLUMN user_id DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_external_org_id
      ON forex_org_memberships(external_org_id)
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_user_external_id
      ON forex_org_memberships(user_external_id)
  `)

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_forex_org_memberships_org_external_user_unique
      ON forex_org_memberships(external_org_id, user_external_id)
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_forex_organizations_owner_external_user_id
      ON forex_organizations(owner_external_user_id)
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
          user_email,
          external_org_id,
          membership_external_id,
          role,
          status,
          permissions,
          membership_snapshot,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, NOW())
        ON CONFLICT (external_org_id, user_external_id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, forex_org_memberships.user_id),
          user_external_id = EXCLUDED.user_external_id,
          user_email = EXCLUDED.user_email,
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
        typeof externalProfile.email === "string" ? externalProfile.email : null,
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

export function normalizeForexOrganizationPayload(payload: ForexOrganizationWebhookPayload) {
  const externalOrgId = getString(payload._id) || getString(payload.id)
  const ownerExternalUserId = getString(payload.userId) || getString(payload.ownerUserId)

  return {
    externalOrgId,
    ownerExternalUserId,
    name: getString(payload.name) || externalOrgId || "Unnamed organization",
    nickname: getString(payload.nickName) || getString(payload.nickname),
    ownerEmail: getString(payload.email),
    status: getString(payload.status),
    coiFileUrl: getString(payload.coiFile),
    contractFileUrl: getString(payload.contractFile),
    stripeCustomerId: getString(payload.stripeCustomerId),
    stripeSubscriptionId:
      getString(payload.stripeSubscriptionId) || getString(payload.subscriptionId),
    stripePlanStatus: getString(payload.stripePlanStatus),
    orgPlanId: getString(payload.orgPlanId),
    activePriceIds: getStringArray(payload.activePriceIds),
    serviceStatuses: asRecord(payload.serviceStatuses),
    servicePeriodEnds: asRecord(payload.servicePeriodEnds),
    subscriptionPeriodEnd: getDate(payload.subscriptionPeriodEnd),
    createdDate: getDate(payload.createdDate),
    updatedDate: getDate(payload.updatedDate),
  }
}

export async function syncForexOrganizationWebhook(
  client: Queryable,
  payload: ForexOrganizationWebhookPayload,
) {
  await ensureForexOrgTables(client)

  const normalized = normalizeForexOrganizationPayload(payload)

  if (!normalized.externalOrgId) {
    throw new Error("Organization webhook payload is missing _id")
  }

  let localOwnerUserId: string | null = null
  if (normalized.ownerExternalUserId) {
    const ownerResult = await client.query(
      "SELECT id FROM users WHERE external_id = $1 LIMIT 1",
      [normalized.ownerExternalUserId],
    )
    localOwnerUserId = ownerResult.rows[0]?.id ?? null
  }

  await client.query(
    `
      INSERT INTO forex_organizations (
        external_org_id,
        name,
        nickname,
        status,
        owner_external_user_id,
        owner_email,
        coi_file_url,
        contract_file_url,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_plan_status,
        org_plan_id,
        active_price_ids,
        service_statuses,
        service_period_ends,
        subscription_period_end,
        org_snapshot,
        last_webhook_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16,
        $17::jsonb, NOW(), NOW()
      )
      ON CONFLICT (external_org_id) DO UPDATE SET
        name = EXCLUDED.name,
        nickname = EXCLUDED.nickname,
        status = EXCLUDED.status,
        owner_external_user_id = EXCLUDED.owner_external_user_id,
        owner_email = EXCLUDED.owner_email,
        coi_file_url = EXCLUDED.coi_file_url,
        contract_file_url = EXCLUDED.contract_file_url,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        stripe_plan_status = EXCLUDED.stripe_plan_status,
        org_plan_id = EXCLUDED.org_plan_id,
        active_price_ids = EXCLUDED.active_price_ids,
        service_statuses = EXCLUDED.service_statuses,
        service_period_ends = EXCLUDED.service_period_ends,
        subscription_period_end = EXCLUDED.subscription_period_end,
        org_snapshot = EXCLUDED.org_snapshot,
        last_webhook_at = NOW(),
        updated_at = NOW()
    `,
    [
      normalized.externalOrgId,
      normalized.name,
      normalized.nickname,
      normalized.status,
      normalized.ownerExternalUserId,
      normalized.ownerEmail,
      normalized.coiFileUrl,
      normalized.contractFileUrl,
      normalized.stripeCustomerId,
      normalized.stripeSubscriptionId,
      normalized.stripePlanStatus,
      normalized.orgPlanId,
      JSON.stringify(normalized.activePriceIds),
      JSON.stringify(normalized.serviceStatuses),
      JSON.stringify(normalized.servicePeriodEnds),
      normalized.subscriptionPeriodEnd,
      JSON.stringify(payload),
    ],
  )

  if (normalized.ownerExternalUserId) {
    await client.query(
      `
        INSERT INTO forex_org_memberships (
          user_id,
          user_external_id,
          user_email,
          external_org_id,
          role,
          status,
          permissions,
          membership_snapshot,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'organization_admin', $5, '[]'::jsonb, $6::jsonb, NOW())
        ON CONFLICT (external_org_id, user_external_id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, forex_org_memberships.user_id),
          user_email = COALESCE(EXCLUDED.user_email, forex_org_memberships.user_email),
          role = 'organization_admin',
          status = EXCLUDED.status,
          membership_snapshot = EXCLUDED.membership_snapshot,
          updated_at = NOW()
      `,
      [
        localOwnerUserId,
        normalized.ownerExternalUserId,
        normalized.ownerEmail,
        normalized.externalOrgId,
        normalized.status || "active",
        JSON.stringify({
          source: "forex_organization_webhook",
          userId: normalized.ownerExternalUserId,
          email: normalized.ownerEmail,
          organization: payload,
        }),
      ],
    )
  }

  let syncedOrgUsersCount = 0
  const orgUsers = getOrgUsers(payload)

  for (const orgUser of orgUsers) {
    const userExternalId = getString(orgUser.userId) || getString(orgUser._id) || getString(orgUser.id)
    if (!userExternalId) continue

    const localUserResult = await client.query(
      "SELECT id FROM users WHERE external_id = $1 LIMIT 1",
      [userExternalId],
    )
    const localUserId = localUserResult.rows[0]?.id ?? null
    const explicitRole = getString(orgUser.role)
    const role = explicitRole
      || (userExternalId === normalized.ownerExternalUserId ? "organization_admin" : "organization_user")
    const status = getString(orgUser.status) || "active"
    const email = getString(orgUser.email)
    const membershipExternalId = getString(orgUser._id) || getString(orgUser.id)
    const permissions = Array.isArray(orgUser.permissions) ? orgUser.permissions : []

    await client.query(
      `
        INSERT INTO forex_org_memberships (
          user_id,
          user_external_id,
          user_email,
          external_org_id,
          membership_external_id,
          role,
          status,
          permissions,
          membership_snapshot,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, NOW())
        ON CONFLICT (external_org_id, user_external_id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, forex_org_memberships.user_id),
          user_email = COALESCE(EXCLUDED.user_email, forex_org_memberships.user_email),
          membership_external_id = COALESCE(EXCLUDED.membership_external_id, forex_org_memberships.membership_external_id),
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          permissions = EXCLUDED.permissions,
          membership_snapshot = EXCLUDED.membership_snapshot,
          updated_at = NOW()
      `,
      [
        localUserId,
        userExternalId,
        email,
        normalized.externalOrgId,
        membershipExternalId,
        role,
        status,
        JSON.stringify(permissions),
        JSON.stringify({
          source: "forex_organization_webhook_org_users",
          organizationId: normalized.externalOrgId,
          user: orgUser,
        }),
      ],
    )

    syncedOrgUsersCount += 1
  }

  return {
    externalOrgId: normalized.externalOrgId,
    ownerExternalUserId: normalized.ownerExternalUserId,
    localOwnerUserId,
    syncedOrgUsersCount,
  }
}
