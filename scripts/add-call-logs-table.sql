-- Add call_logs table migration
-- Run this to add the call_logs table to existing database

-- Note: Using gen_random_uuid() which is built into modern PostgreSQL

-- Call logs table for storing Bland.ai webhook call data
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) UNIQUE NOT NULL, -- Bland.ai's call ID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50) NOT NULL,
    duration_seconds INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recording_url TEXT,
    transcript TEXT,
    summary TEXT,
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

-- Call logs table indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_from_number ON call_logs(from_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_to_number ON call_logs(to_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number_id ON call_logs(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_pathway_id ON call_logs(pathway_id);

-- Add trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_logs_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_call_logs_updated_at 
    BEFORE UPDATE ON call_logs 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_call_logs_updated_at_column();

-- Verify the table was created successfully
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_logs' 
ORDER BY ordinal_position;

