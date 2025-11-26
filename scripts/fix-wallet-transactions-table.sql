
-- Ensure wallet_transactions table has the gateway column
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS gateway text;

-- Ensure wallet_transactions table has the created_at column with default
ALTER TABLE wallet_transactions 
ALTER COLUMN created_at SET DEFAULT now();

-- Check if there are any missing columns and add them
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
