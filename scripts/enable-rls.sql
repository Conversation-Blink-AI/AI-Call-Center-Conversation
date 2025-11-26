
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create function to get current user ID from session
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
BEGIN
  -- In a real implementation, this would extract user ID from JWT or session
  -- For now, we'll use a simple approach
  RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = current_user_id());

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = current_user_id());

-- Phone numbers table policies
DROP POLICY IF EXISTS "Users can view own phone numbers" ON phone_numbers;
CREATE POLICY "Users can view own phone numbers" ON phone_numbers
  FOR SELECT USING (user_id = current_user_id());

DROP POLICY IF EXISTS "Users can insert own phone numbers" ON phone_numbers;
CREATE POLICY "Users can insert own phone numbers" ON phone_numbers
  FOR INSERT WITH CHECK (user_id = current_user_id());

DROP POLICY IF EXISTS "Users can update own phone numbers" ON phone_numbers;
CREATE POLICY "Users can update own phone numbers" ON phone_numbers
  FOR UPDATE USING (user_id = current_user_id());

DROP POLICY IF EXISTS "Users can delete own phone numbers" ON phone_numbers;
CREATE POLICY "Users can delete own phone numbers" ON phone_numbers
  FOR DELETE USING (user_id = current_user_id());

-- Teams table policies
DROP POLICY IF EXISTS "Users can view teams they own or are members of" ON teams;
CREATE POLICY "Users can view teams they own or are members of" ON teams
  FOR SELECT USING (
    owner_id = current_user_id() OR 
    id IN (SELECT team_id FROM team_members WHERE user_id = current_user_id())
  );

DROP POLICY IF EXISTS "Team owners can update teams" ON teams;
CREATE POLICY "Team owners can update teams" ON teams
  FOR UPDATE USING (owner_id = current_user_id());

DROP POLICY IF EXISTS "Team owners can delete teams" ON teams;
CREATE POLICY "Team owners can delete teams" ON teams
  FOR DELETE USING (owner_id = current_user_id());

-- Team members table policies
DROP POLICY IF EXISTS "Users can view team memberships" ON team_members;
CREATE POLICY "Users can view team memberships" ON team_members
  FOR SELECT USING (
    user_id = current_user_id() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = current_user_id())
  );

-- Pathways table policies
DROP POLICY IF EXISTS "Users can view accessible pathways" ON pathways;
CREATE POLICY "Users can view accessible pathways" ON pathways
  FOR SELECT USING (
    creator_id = current_user_id() OR
    team_id IN (SELECT team_id FROM team_members WHERE user_id = current_user_id()) OR
    team_id IN (SELECT id FROM teams WHERE owner_id = current_user_id())
  );

DROP POLICY IF EXISTS "Users can create pathways" ON pathways;
CREATE POLICY "Users can create pathways" ON pathways
  FOR INSERT WITH CHECK (creator_id = current_user_id());

DROP POLICY IF EXISTS "Pathway creators and team owners can update pathways" ON pathways;
CREATE POLICY "Pathway creators and team owners can update pathways" ON pathways
  FOR UPDATE USING (
    creator_id = current_user_id() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = current_user_id())
  );

-- Activities table policies
DROP POLICY IF EXISTS "Users can view pathway activities" ON activities;
CREATE POLICY "Users can view pathway activities" ON activities
  FOR SELECT USING (
    pathway_id IN (
      SELECT id FROM pathways 
      WHERE creator_id = current_user_id() OR
      team_id IN (SELECT team_id FROM team_members WHERE user_id = current_user_id()) OR
      team_id IN (SELECT id FROM teams WHERE owner_id = current_user_id())
    )
  );

-- Invitations table policies
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON invitations;
CREATE POLICY "Users can view invitations sent to them" ON invitations
  FOR SELECT USING (
    email = (SELECT email FROM users WHERE id = current_user_id()) OR
    team_id IN (SELECT id FROM teams WHERE owner_id = current_user_id())
  );
