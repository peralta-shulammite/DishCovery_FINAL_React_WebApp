-- Migration: Update category_id 3 to "Good For Everyone" (replacing Dietary Lifestyle)
-- This migration updates the restriction_categories table to set category_id 3 as "Good For Everyone"

-- First, check if category_id 3 exists and update it
UPDATE restriction_categories
SET category_name = 'Good For Everyone',
    is_active = 1,
    updated_at = NOW()
WHERE category_id = 3;

-- If category_id 3 doesn't exist, insert it
INSERT INTO restriction_categories (category_id, category_name, is_active, created_at, updated_at)
SELECT 3, 'Good For Everyone', 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM restriction_categories WHERE category_id = 3
);

-- Verify the update
SELECT
    category_id,
    category_name,
    is_active,
    created_at,
    updated_at
FROM restriction_categories
WHERE category_id = 3;

