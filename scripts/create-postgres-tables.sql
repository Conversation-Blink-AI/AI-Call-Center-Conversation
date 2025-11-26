-- Note: Using gen_random_uuid() which is built into modern PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    company VARCHAR(255),
    phone_number VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    password_hash VARCHAR(255), -- Keep for backwards compatibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    external_id VARCHAR(255), -- Store external API user ID
    external_token TEXT, -- Store external API JWT token
    is_verified BOOLEAN DEFAULT false, -- Email verification status
    platform VARCHAR(50) DEFAULT 'AI Call', -- Platform identifier
    verification_token VARCHAR(255), -- For email verification
    verification_expires_at TIMESTAMP WITH TIME ZONE
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Pathways table
CREATE TABLE IF NOT EXISTS pathways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    updater_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB,
    bland_id VARCHAR(255),
    phone_number_id UUID
);

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location VARCHAR(255),
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    assigned_to VARCHAR(255),
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pathway_id UUID REFERENCES pathways(id) ON DELETE SET NULL,
    subscription_plan VARCHAR(100)
);

-- Pathway phone number relationships
CREATE TABLE IF NOT EXISTS pathway_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pathway_id UUID REFERENCES pathways(id) ON DELETE CASCADE,
    phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pathway_id, phone_number_id)
);

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pathways_team_id ON pathways(team_id);
CREATE INDEX IF NOT EXISTS idx_pathways_creator_id ON pathways(creator_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_phone_number ON phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_pathway_phone_numbers_pathway_id ON pathway_phone_numbers(pathway_id);
CREATE INDEX IF NOT EXISTS idx_pathway_phone_numbers_phone_number_id ON pathway_phone_numbers(phone_number_id);

-- Calls table indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_from_number ON calls(from_number);
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON calls(to_number);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_phone_number_id ON calls(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_calls_pathway_id ON calls(pathway_id);