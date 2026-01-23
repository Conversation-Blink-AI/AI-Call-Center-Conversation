-- Create admin_audit_logs table for tracking all admin actions
-- This is a security must-have: every admin action must be logged

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., "block_number", "adjust_wallet", "unblock_number"
    resource_type VARCHAR(50) NOT NULL, -- e.g., "phone_number", "wallet", "user", "payment"
    resource_id UUID, -- ID of the resource being modified (nullable for list actions)
    old_value JSONB, -- Previous state (nullable)
    new_value JSONB, -- New state (nullable)
    metadata JSONB, -- Additional context (nullable)
    ip_address VARCHAR(45), -- IPv4 or IPv6 address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_type ON admin_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_id ON admin_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);

-- Add comments for documentation
COMMENT ON TABLE admin_audit_logs IS 'Audit log of all admin actions for security and compliance';
COMMENT ON COLUMN admin_audit_logs.action IS 'The action performed (e.g., block_number, adjust_wallet)';
COMMENT ON COLUMN admin_audit_logs.resource_type IS 'Type of resource being modified';
COMMENT ON COLUMN admin_audit_logs.resource_id IS 'ID of the specific resource (nullable for list/query actions)';
COMMENT ON COLUMN admin_audit_logs.old_value IS 'Previous state before modification (JSONB)';
COMMENT ON COLUMN admin_audit_logs.new_value IS 'New state after modification (JSONB)';
COMMENT ON COLUMN admin_audit_logs.metadata IS 'Additional context about the action (JSONB)';
