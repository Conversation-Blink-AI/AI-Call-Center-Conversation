-- Hustle org/member sync schema additions

ALTER TABLE forex_organizations
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS workspace_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hustle_plan VARCHAR(50),
  ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);

ALTER TABLE forex_org_memberships
  ADD COLUMN IF NOT EXISTS hustle_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS call_center_role VARCHAR(100);
