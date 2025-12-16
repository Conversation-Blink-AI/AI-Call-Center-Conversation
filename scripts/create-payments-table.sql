-- Create payments table for storing payment records from Stripe and PayPal
-- This table is required for the webhook handlers to function properly

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    gateway TEXT NOT NULL,
    gateway_payment_id TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    status TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Add comment for documentation
COMMENT ON TABLE payments IS 'Stores payment records from payment gateways (Stripe, PayPal)';
COMMENT ON COLUMN payments.gateway IS 'Payment gateway name: stripe or paypal';
COMMENT ON COLUMN payments.gateway_payment_id IS 'Payment ID from the gateway (Stripe session ID, PayPal order ID, etc.)';
COMMENT ON COLUMN payments.amount_cents IS 'Payment amount in cents';
COMMENT ON COLUMN payments.status IS 'Payment status: succeeded, failed, pending, etc.';

