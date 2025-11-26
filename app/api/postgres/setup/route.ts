import { NextResponse } from "next/server"
import { Client } from "pg"

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL environment variable is not set"
    }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log("✅ Connected to PostgreSQL database")

    // Read and execute the table creation script
    const createTablesScript = `
-- Create all tables matching the Supabase schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    company VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255) NOT NULL
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
);

-- Pathways table
CREATE TABLE IF NOT EXISTS pathways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    updater_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB,
    bland_id VARCHAR(255),
    phone_number VARCHAR(20),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (updater_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pathway_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (pathway_id) REFERENCES pathways(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    team_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    pathway_id UUID,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location VARCHAR(100),
    type VARCHAR(50) DEFAULT 'Local',
    status VARCHAR(50) DEFAULT 'Active',
    monthly_fee DECIMAL(10,2) DEFAULT 1.00,
    assigned_to VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pathway_id) REFERENCES pathways(id) ON DELETE SET NULL
);
    `

    const indexScript = `
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pathways_team_id ON pathways(team_id);
CREATE INDEX IF NOT EXISTS idx_pathways_creator_id ON pathways(creator_id);
CREATE INDEX IF NOT EXISTS idx_activities_pathway_id ON activities(pathway_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_team_id ON invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_pathway_id ON phone_numbers(pathway_id);
    `

    const triggerScript = `
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
DROP TRIGGER IF EXISTS update_pathways_updated_at ON pathways;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pathways_updated_at BEFORE UPDATE ON pathways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    console.log("🔄 Creating tables...")
    await client.query(createTablesScript)
    console.log("✅ Tables created successfully")

    console.log("🔄 Creating indexes...")
    await client.query(indexScript)
    console.log("✅ Indexes created successfully")

    console.log("🔄 Creating triggers...")
    await client.query(triggerScript)
    console.log("✅ Triggers created successfully")

    // Get table count
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    return NextResponse.json({
      success: true,
      message: "PostgreSQL tables created successfully!",
      data: {
        tables_created: result.rows.map(row => row.table_name),
        total_tables: result.rows.length
      }
    })

  } catch (error) {
    console.error("❌ Error setting up PostgreSQL:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to set up PostgreSQL tables",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL environment variable is not set"
    }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()

    // Get table information
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    const tables = []
    for (const table of tablesResult.rows) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`)
      tables.push({
        name: table.table_name,
        row_count: parseInt(countResult.rows[0].count)
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        total_tables: tables.length,
        tables: tables
      }
    })

  } catch (error) {
    console.error("❌ Error checking PostgreSQL:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to check PostgreSQL tables",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    await client.end()
  }
}