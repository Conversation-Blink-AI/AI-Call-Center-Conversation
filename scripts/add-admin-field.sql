-- Add is_admin field to users table
-- This enables simple boolean-based admin access control

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Boolean flag indicating if user has admin access to /admin/* routes';
