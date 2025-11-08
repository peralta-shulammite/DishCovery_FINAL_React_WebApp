-- Migration: Add dietary_info column to ingredients table
-- This column will store dietary information as JSON for easier querying

ALTER TABLE ingredients 
ADD COLUMN dietary_info JSON NULL AFTER nutritional_data;

-- Migrate existing data from nutritional_data to dietary_info
UPDATE ingredients 
SET dietary_info = JSON_OBJECT(
  'dietaryRestrictions', 
  COALESCE(JSON_EXTRACT(nutritional_data, '$.dietaryRestrictions'), JSON_ARRAY()),
  'dietaryLifestyles', 
  COALESCE(JSON_EXTRACT(nutritional_data, '$.dietaryLifestyles'), JSON_ARRAY())
)
WHERE nutritional_data IS NOT NULL;

-- Set default empty JSON for rows with NULL dietary_info
UPDATE ingredients 
SET dietary_info = JSON_OBJECT('dietaryRestrictions', JSON_ARRAY(), 'dietaryLifestyles', JSON_ARRAY())
WHERE dietary_info IS NULL;

