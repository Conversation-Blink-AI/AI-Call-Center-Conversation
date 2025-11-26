
-- Migration: Flip pathway-phone relationship
-- Move from phone_numbers.pathway_id to pathways.phone_number_id

-- 1) Add the new phone_number_id column to pathways
ALTER TABLE pathways
  ADD COLUMN phone_number_id UUID UNIQUE
    REFERENCES phone_numbers(id)
    ON DELETE CASCADE;

-- 2) Migrate existing data
-- Copy pathway_id links from phone_numbers to pathways
UPDATE pathways p
SET phone_number_id = pn.id
FROM phone_numbers pn
WHERE pn.pathway_id = p.id;

-- 3) Clean up the old column
-- Drop the old pathway_id foreign key constraint and column
ALTER TABLE phone_numbers
  DROP CONSTRAINT IF EXISTS phone_numbers_pathway_id_fkey,
  DROP COLUMN IF EXISTS pathway_id;

-- 4) Add index for performance
CREATE INDEX IF NOT EXISTS idx_pathways_phone_number_id ON pathways(phone_number_id);

-- Verify the migration
SELECT 
  'Migration completed' as status,
  COUNT(*) as total_pathways,
  COUNT(phone_number_id) as pathways_with_phone
FROM pathways;
