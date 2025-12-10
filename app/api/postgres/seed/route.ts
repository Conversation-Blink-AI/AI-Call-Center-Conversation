
import { NextResponse } from "next/server"
import { Client } from "pg"
import * as bcrypt from "bcryptjs"

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL environment variable is not set"
    }, { status: 500 })
  }

  const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

  try {
    await client.connect()
    console.log("✅ Connected to PostgreSQL database")

    // Hash password for sample users
    const passwordHash = await bcrypt.hash("password123", 12)

    const seedScript = `
-- Insert sample users
INSERT INTO users (id, email, first_name, last_name, company, role, phone_number, password_hash) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@replit.com', 'Admin', 'User', 'Replit Inc', 'admin', '+1-555-0101', '${passwordHash}'),
    ('550e8400-e29b-41d4-a716-446655440002', 'user@test.com', 'Test', 'User', 'Test Company', 'user', '+1-555-0102', '${passwordHash}'),
    ('550e8400-e29b-41d4-a716-446655440003', 'manager@example.com', 'Manager', 'User', 'Example Corp', 'manager', '+1-555-0103', '${passwordHash}')
ON CONFLICT (id) DO NOTHING;
import { getSSLConfig } from "@/lib/db-client"

-- Insert sample teams
INSERT INTO teams (id, name, description, owner_id)
VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', 'Engineering Team', 'Main development team', '550e8400-e29b-41d4-a716-446655440001'),
    ('660e8400-e29b-41d4-a716-446655440002', 'Sales Team', 'Customer acquisition team', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO NOTHING;

-- Insert team members
INSERT INTO team_members (id, team_id, user_id, role)
VALUES 
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'developer'),
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'manager'),
    ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'admin')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Insert sample pathways
INSERT INTO pathways (id, name, description, team_id, creator_id, updater_id, data, phone_number)
VALUES 
    ('880e8400-e29b-41d4-a716-446655440001', 'Customer Onboarding Flow', 'Standard customer onboarding call flow', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 
     '{"nodes": [{"id": "1", "type": "greetingNode", "position": {"x": 100, "y": 100}, "data": {"name": "Welcome", "text": "Hello! Thank you for choosing our service. How can I help you today?", "extractVars": []}}], "edges": []}', 
     '+1-555-1001'),
    ('880e8400-e29b-41d4-a716-446655440002', 'Sales Qualification Call', 'Qualifying potential customers', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002',
     '{"nodes": [{"id": "1", "type": "greetingNode", "position": {"x": 100, "y": 100}, "data": {"name": "Sales Greeting", "text": "Hi there! I am calling to discuss how we can help your business grow.", "extractVars": []}}], "edges": []}',
     '+1-555-1002')
ON CONFLICT (id) DO NOTHING;

-- Insert sample activities
INSERT INTO activities (id, pathway_id, user_id, action, details)
VALUES 
    ('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'created', '{"message": "Pathway created successfully"}'),
    ('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'updated', '{"message": "Updated greeting node", "changes": ["text"]}'),
    ('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'created', '{"message": "Sales pathway initialized"}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample invitations
INSERT INTO invitations (id, email, team_id, role, token, expires_at)
VALUES 
    ('aa0e8400-e29b-41d4-a716-446655440001', 'newuser@example.com', '660e8400-e29b-41d4-a716-446655440001', 'developer', 'inv_token_001', NOW() + INTERVAL '7 days'),
    ('aa0e8400-e29b-41d4-a716-446655440002', 'contractor@freelance.com', '660e8400-e29b-41d4-a716-446655440002', 'member', 'inv_token_002', NOW() + INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample phone numbers
INSERT INTO phone_numbers (id, phone_number, user_id, pathway_id, location, type, status, monthly_fee, assigned_to)
VALUES 
    ('bb0e8400-e29b-41d4-a716-446655440001', '+1-555-1001', '550e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'New York, NY', 'Local', 'Active', 1.50, 'Customer Onboarding'),
    ('bb0e8400-e29b-41d4-a716-446655440002', '+1-555-1002', '550e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002', 'San Francisco, CA', 'Local', 'Active', 1.50, 'Sales Team'),
    ('bb0e8400-e29b-41d4-a716-446655440003', '+1-800-555-0123', '550e8400-e29b-41d4-a716-446655440001', NULL, 'Toll-Free', 'Toll-Free', 'Active', 3.00, 'General Inquiries')
ON CONFLICT (id) DO NOTHING;
    `

    console.log("🔄 Seeding data...")
    await client.query(seedScript)
    console.log("✅ Data seeded successfully")

    // Get counts of inserted data
    const counts = {}
    const tables = ['users', 'teams', 'team_members', 'pathways', 'activities', 'invitations', 'phone_numbers']
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`)
      counts[table] = parseInt(result.rows[0].count)
    }

    return NextResponse.json({
      success: true,
      message: "PostgreSQL data seeded successfully!",
      data: {
        record_counts: counts
      }
    })

  } catch (error) {
    console.error("❌ Error seeding PostgreSQL:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to seed PostgreSQL data",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    await client.end()
  }
}
