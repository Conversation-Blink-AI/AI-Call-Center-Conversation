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
);

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
);

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
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE forex_org_memberships
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_external_org_id
  ON forex_org_memberships(external_org_id);

CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_user_external_id
  ON forex_org_memberships(user_external_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_forex_org_memberships_org_external_user_unique
  ON forex_org_memberships(external_org_id, user_external_id);

CREATE INDEX IF NOT EXISTS idx_forex_organizations_owner_external_user_id
  ON forex_organizations(owner_external_user_id);
