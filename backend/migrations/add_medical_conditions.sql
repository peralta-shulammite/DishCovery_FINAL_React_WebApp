-- Migration: Replace all restrictions with standard medical conditions (Allergies & Intolerances)
-- This migration removes all existing restrictions and category_id 3, then adds only the standard medical conditions

-- First, ensure the categories exist (only Allergy and Intolerance)
INSERT IGNORE INTO restriction_categories (category_id, category_name, is_active, created_at)
VALUES 
  (1, 'Allergy', 1, NOW()),
  (2, 'Intolerance', 1, NOW());

-- Deactivate category_id 3 (Dietary Lifestyle) if it exists
UPDATE restriction_categories 
SET is_active = 0 
WHERE category_id = 3;

-- Delete all restrictions with category_id 3 first
DELETE FROM restrictions WHERE category_id = 3;

-- Delete all user_restrictions that reference category_id 3 restrictions
DELETE ur FROM user_restrictions ur
INNER JOIN restrictions r ON ur.restriction_id = r.restriction_id
WHERE r.category_id = 3;

-- Delete all recipe_restrictions that reference category_id 3 restrictions
DELETE rr FROM recipe_restrictions rr
INNER JOIN restrictions r ON rr.restriction_id = r.restriction_id
WHERE r.category_id = 3;

-- Delete ALL remaining existing restrictions (we'll replace them with the standard list)
DELETE FROM restrictions;

-- Delete all user_restrictions that reference deleted restrictions (cleanup)
DELETE ur FROM user_restrictions ur
LEFT JOIN restrictions r ON ur.restriction_id = r.restriction_id
WHERE r.restriction_id IS NULL;

-- Delete all recipe_restrictions that reference deleted restrictions (cleanup)
DELETE rr FROM recipe_restrictions rr
LEFT JOIN restrictions r ON rr.restriction_id = r.restriction_id
WHERE r.restriction_id IS NULL;

-- Insert the standard medical conditions
-- Allergies (Category ID = 1)
INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active, created_at)
VALUES 
  ('Allergy To Nuts', 1, 'Allergic reaction to nuts and tree nuts', 'High', 1, NOW()),
  ('Allergy To Shellfishes', 1, 'Allergic reaction to shellfish and crustaceans', 'High', 1, NOW()),
  ('Allergy To Eggs', 1, 'Allergic reaction to eggs and egg products', 'High', 1, NOW()),
  ('Allergy To Soy', 1, 'Allergic reaction to soy and soy products', 'High', 1, NOW()),
  ('Allergy To Dairy', 1, 'Allergic reaction to dairy products', 'High', 1, NOW()),
  ('Allergy To Sesame Seeds', 1, 'Allergic reaction to sesame seeds and sesame products', 'High', 1, NOW()),
  ('Allergy To Legumes', 1, 'Allergic reaction to legumes including beans, peas, and lentils', 'High', 1, NOW());

-- Intolerances (Category ID = 2)
INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active, created_at)
VALUES 
  ('Gluten Intolerance', 2, 'Intolerance to gluten found in wheat, barley, and rye', 'Medium', 1, NOW()),
  ('Lactose Intolerance', 2, 'Intolerance to lactose found in dairy products', 'Medium', 1, NOW());

-- Verify the insertions
SELECT 
  r.restriction_id,
  r.restriction_name,
  rc.category_name,
  r.is_active
FROM restrictions r
JOIN restriction_categories rc ON r.category_id = rc.category_id
WHERE r.category_id IN (1, 2) AND r.is_active = 1
ORDER BY rc.category_name, r.restriction_name;

