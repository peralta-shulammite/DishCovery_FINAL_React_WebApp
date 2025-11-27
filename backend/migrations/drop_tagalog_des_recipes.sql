-- Drop tagalog_des column from recipes table
-- This script consolidates the subtitle field for recipes

-- First, copy any data from tagalog_des to subtitle if subtitle is null
UPDATE recipes SET subtitle = tagalog_des WHERE subtitle IS NULL AND tagalog_des IS NOT NULL;

-- Then drop the tagalog_des column
ALTER TABLE recipes DROP COLUMN tagalog_des;
