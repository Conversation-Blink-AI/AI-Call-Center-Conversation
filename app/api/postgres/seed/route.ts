
import { NextResponse } from "next/server"
import { Client } from "pg"
import * as bcrypt from "bcryptjs"
import { getSSLConfig } from "@/lib/db-client"
import { encryptString, hashEmail, hashPhoneNumber, phoneLast4 } from "@/lib/encryption"
import { normalizeEmail } from "@/lib/utils"
import { toE164Format } from "@/utils/phone-utils"

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

    const userSeed = [
      { id: '550e8400-e29b-41d4-a716-446655440001', email: 'admin@replit.com', first: 'Admin', last: 'User', company: 'Replit Inc', role: 'admin', phone: '+1-555-0101' },
      { id: '550e8400-e29b-41d4-a716-446655440002', email: 'user@test.com', first: 'Test', last: 'User', company: 'Test Company', role: 'user', phone: '+1-555-0102' },
      { id: '550e8400-e29b-41d4-a716-446655440003', email: 'manager@example.com', first: 'Manager', last: 'User', company: 'Example Corp', role: 'manager', phone: '+1-555-0103' }
    ].map((user) => {
      const normalizedEmail = normalizeEmail(user.email)
      const normalizedPhone = toE164Format(user.phone)
      return {
        ...user,
        email: normalizedEmail,
        emailEnc: encryptString(normalizedEmail),
        emailHash: hashEmail(normalizedEmail),
        phone: normalizedPhone,
        phoneEnc: encryptString(normalizedPhone),
        phoneHash: hashPhoneNumber(normalizedPhone),
        phoneLast: phoneLast4(normalizedPhone)
      }
    })

    const phoneSeed = [
      { id: 'bb0e8400-e29b-41d4-a716-446655440001', phone: '+1-555-1001', userId: '550e8400-e29b-41d4-a716-446655440001', pathwayId: '880e8400-e29b-41d4-a716-446655440001', location: 'New York, NY', type: 'Local', status: 'Active', fee: 1.50, assigned: 'Customer Onboarding' },
      { id: 'bb0e8400-e29b-41d4-a716-446655440002', phone: '+1-555-1002', userId: '550e8400-e29b-41d4-a716-446655440002', pathwayId: '880e8400-e29b-41d4-a716-446655440002', location: 'San Francisco, CA', type: 'Local', status: 'Active', fee: 1.50, assigned: 'Sales Team' },
      { id: 'bb0e8400-e29b-41d4-a716-446655440003', phone: '+1-800-555-0123', userId: '550e8400-e29b-41d4-a716-446655440001', pathwayId: null, location: 'Toll-Free', type: 'Toll-Free', status: 'Active', fee: 3.00, assigned: 'General Inquiries' }
    ].map((phone) => {
      const normalizedPhone = toE164Format(phone.phone)
      return {
        ...phone,
        phone: normalizedPhone,
        phoneEnc: encryptString(normalizedPhone),
        phoneHash: hashPhoneNumber(normalizedPhone),
        phoneLast: phoneLast4(normalizedPhone)
      }
    })

    const seedScript = `
-- Insert sample users
INSERT INTO users (
  id,
  email,
  email_enc,
  email_hash,
  first_name,
  last_name,
  company,
  role,
  phone_number,
  phone_number_enc,
  phone_number_hash,
  phone_number_last4,
  password_hash
) 
VALUES 
    ('${userSeed[0].id}', '${userSeed[0].email}', '${userSeed[0].emailEnc}', '${userSeed[0].emailHash}', '${userSeed[0].first}', '${userSeed[0].last}', '${userSeed[0].company}', '${userSeed[0].role}', '${userSeed[0].phone}', '${userSeed[0].phoneEnc}', '${userSeed[0].phoneHash}', '${userSeed[0].phoneLast}', '${passwordHash}'),
    ('${userSeed[1].id}', '${userSeed[1].email}', '${userSeed[1].emailEnc}', '${userSeed[1].emailHash}', '${userSeed[1].first}', '${userSeed[1].last}', '${userSeed[1].company}', '${userSeed[1].role}', '${userSeed[1].phone}', '${userSeed[1].phoneEnc}', '${userSeed[1].phoneHash}', '${userSeed[1].phoneLast}', '${passwordHash}'),
    ('${userSeed[2].id}', '${userSeed[2].email}', '${userSeed[2].emailEnc}', '${userSeed[2].emailHash}', '${userSeed[2].first}', '${userSeed[2].last}', '${userSeed[2].company}', '${userSeed[2].role}', '${userSeed[2].phone}', '${userSeed[2].phoneEnc}', '${userSeed[2].phoneHash}', '${userSeed[2].phoneLast}', '${passwordHash}')
ON CONFLICT (id) DO NOTHING;

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
INSERT INTO phone_numbers (
  id,
  phone_number,
  phone_number_enc,
  phone_number_hash,
  phone_number_last4,
  user_id,
  pathway_id,
  location,
  type,
  status,
  monthly_fee,
  assigned_to
)
VALUES 
    ('${phoneSeed[0].id}', '${phoneSeed[0].phone}', '${phoneSeed[0].phoneEnc}', '${phoneSeed[0].phoneHash}', '${phoneSeed[0].phoneLast}', '${phoneSeed[0].userId}', '${phoneSeed[0].pathwayId}', '${phoneSeed[0].location}', '${phoneSeed[0].type}', '${phoneSeed[0].status}', ${phoneSeed[0].fee}, '${phoneSeed[0].assigned}'),
    ('${phoneSeed[1].id}', '${phoneSeed[1].phone}', '${phoneSeed[1].phoneEnc}', '${phoneSeed[1].phoneHash}', '${phoneSeed[1].phoneLast}', '${phoneSeed[1].userId}', '${phoneSeed[1].pathwayId}', '${phoneSeed[1].location}', '${phoneSeed[1].type}', '${phoneSeed[1].status}', ${phoneSeed[1].fee}, '${phoneSeed[1].assigned}'),
    ('${phoneSeed[2].id}', '${phoneSeed[2].phone}', '${phoneSeed[2].phoneEnc}', '${phoneSeed[2].phoneHash}', '${phoneSeed[2].phoneLast}', '${phoneSeed[2].userId}', NULL, '${phoneSeed[2].location}', '${phoneSeed[2].type}', '${phoneSeed[2].status}', ${phoneSeed[2].fee}, '${phoneSeed[2].assigned}')
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
