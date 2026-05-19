-- Drop redundant Bland pathway id storage from pathways.
-- The source of truth is phone_numbers.pathwayid, with pathways linked by phone_id.

ALTER TABLE pathways
  DROP COLUMN IF EXISTS bland_id;
