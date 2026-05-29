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
);

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
);

CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_external_org_id
  ON forex_org_memberships(external_org_id);

CREATE INDEX IF NOT EXISTS idx_forex_org_memberships_user_external_id
  ON forex_org_memberships(user_external_id);
