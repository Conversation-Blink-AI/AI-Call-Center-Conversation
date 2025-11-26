
-- Add stripeCustomerId column to users table
ALTER TABLE users 
ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
