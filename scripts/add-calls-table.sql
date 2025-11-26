
-- Add calls table migration
-- Run this to add the calls table to existing database

-- Note: Using gen_random_uuid() which is built into modern PostgreSQL

-- Calls table for storing Bland.ai call data
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) UNIQUE NOT NULL, -- Bland.ai's call ID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_number VARCHAR(50) NOT NULL,
    from_number VARCHAR(50) NOT NULL,
    duration_seconds INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recording_url TEXT,
    transcript TEXT,
    summary TEXT,
    cost_cents INTEGER,
    pathway_id VARCHAR(255), -- Reference to pathway used
    ended_reason VARCHAR(100),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    -- Additional Bland.ai specific fields
    queue_time INTEGER, -- Time spent in queue
    latency_ms INTEGER, -- Call latency
    interruptions INTEGER, -- Number of interruptions
    phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL
);

-- Calls table indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_from_number ON calls(from_number);
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON calls(to_number);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_phone_number_id ON calls(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_calls_pathway_id ON calls(pathway_id);

-- Add trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calls_updated_at 
    BEFORE UPDATE ON calls 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Verify the table was created successfully
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;
