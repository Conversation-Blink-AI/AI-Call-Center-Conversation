
-- Insert sample data into PostgreSQL tables

-- Insert sample users
INSERT INTO users (id, email, name, company, role, phone_number, password_hash) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@replit.com', 'Admin User', 'Replit Inc', 'admin', '+1-555-0101', '$2b$12$y6c4Jgrby9iubbs7./xDWOwsR5FZM3oOX49NG49kOj0uXOjHVmZri'),
    ('550e8400-e29b-41d4-a716-446655440002', 'user@test.com', 'Test User', 'Test Company', 'user', '+1-555-0102', '$2b$12$y6c4Jgrby9iubbs7./xDWOwsR5FZM3oOX49NG49kOj0uXOjHVmZri'),
    ('550e8400-e29b-41d4-a716-446655440003', 'manager@example.com', 'Manager User', 'Example Corp', 'manager', '+1-555-0103', '$2b$12$y6c4Jgrby9iubbs7./xDWOwsR5FZM3oOX49NG49kOj0uXOjHVmZri')
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

-- Insert sample pathways (linked to phone numbers via phone_number_id)
INSERT INTO pathways (id, name, description, team_id, creator_id, updater_id, data, phone_number_id)
VALUES 
    ('880e8400-e29b-41d4-a716-446655440001', 'Customer Onboarding Flow', 'Standard customer onboarding call flow', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 
     '{"nodes": [{"id": "1", "type": "greetingNode", "position": {"x": 100, "y": 100}, "data": {"name": "Welcome", "text": "Hello! Thank you for choosing our service. How can I help you today?", "extractVars": []}}], "edges": []}', 
     'bb0e8400-e29b-41d4-a716-446655440001'),
    ('880e8400-e29b-41d4-a716-446655440002', 'Sales Qualification Call', 'Qualifying potential customers', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002',
     '{"nodes": [{"id": "1", "type": "greetingNode", "position": {"x": 100, "y": 100}, "data": {"name": "Sales Greeting", "text": "Hi there! I''m calling to discuss how we can help your business grow.", "extractVars": []}}], "edges": []}',
     'bb0e8400-e29b-41d4-a716-446655440002')
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

-- Insert sample phone numbers (must be inserted before pathways due to foreign key)
INSERT INTO phone_numbers (id, phone_number, user_id, location, status, monthly_fee, assigned_to)
VALUES 
    ('bb0e8400-e29b-41d4-a716-446655440001', '+1-555-1001', '550e8400-e29b-41d4-a716-446655440001', 'New York, NY', 'active', 1.50, 'Customer Onboarding'),
    ('bb0e8400-e29b-41d4-a716-446655440002', '+1-555-1002', '550e8400-e29b-41d4-a716-446655440002', 'San Francisco, CA', 'active', 1.50, 'Sales Team'),
    ('bb0e8400-e29b-41d4-a716-446655440003', '+1-800-555-0123', '550e8400-e29b-41d4-a716-446655440001', 'Toll-Free', 'active', 3.00, 'General Inquiries')
ON CONFLICT (id) DO NOTHING;
