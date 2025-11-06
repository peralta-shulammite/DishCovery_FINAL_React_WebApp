-- =====================================================
-- DishCovery Restrictions System Restructuring
-- Version: 003
-- Description: Clear and repopulate restrictions table with proper categories
-- Date: 2025-01-06
-- =====================================================

-- Step 1: Clear dependent tables first (foreign key constraints)
DELETE FROM user_restrictions;
DELETE FROM recipe_restrictions;

-- Step 2: Clear existing restrictions
DELETE FROM restrictions;

-- Step 3: Reset auto-increment
ALTER TABLE restrictions AUTO_INCREMENT = 1;

-- Step 4: Update restriction_categories if needed
-- (Already has correct structure: 1=Allergies, 2=Health Conditions, 3=Dietary Lifestyle)
-- Just update descriptions to match new purpose
UPDATE restriction_categories
SET
    category_name = 'Allergy',
    description = 'Food allergies that can cause adverse reactions'
WHERE category_id = 1;

UPDATE restriction_categories
SET
    category_name = 'Intolerance',
    description = 'Food intolerances and medical conditions affecting diet'
WHERE category_id = 2;

UPDATE restriction_categories
SET
    category_name = 'Dietary Lifestyle',
    description = 'Dietary preferences and lifestyle choices'
WHERE category_id = 3;

-- Step 5: Insert Dietary Lifestyle restrictions (Category 3)
INSERT INTO restrictions (category_id, restriction_name, description, severity_level, requires_admin_approval, is_active) VALUES
(3, 'Dairy free', 'Does not consume milk, cheese, butter, or any dairy products', 'moderate', 0, 1),
(3, 'Gluten free', 'Avoids wheat, barley, rye, and gluten-containing grains', 'moderate', 0, 1),
(3, 'Halal', 'Follows Islamic dietary laws and food preparation standards', 'moderate', 0, 1),
(3, 'Vegan', 'Excludes all animal products including meat, dairy, eggs, and honey', 'moderate', 0, 1),
(3, 'Vegetarian', 'Does not consume meat or fish, may include dairy and eggs', 'moderate', 0, 1);

-- Step 6: Insert Allergy restrictions (Category 1)
INSERT INTO restrictions (category_id, restriction_name, description, severity_level, requires_admin_approval, is_active) VALUES
(1, 'Nut allergy', 'Allergic to tree nuts (almonds, walnuts, cashews, pecans, hazelnuts)', 'severe', 0, 1),
(1, 'Peanut allergy', 'Allergic to peanuts and peanut-derived ingredients', 'severe', 0, 1),
(1, 'Shellfish allergy', 'Allergic to shellfish (shrimp, crab, lobster, clams, mussels)', 'severe', 0, 1),
(1, 'Fish allergy', 'Allergic to all types of fish', 'severe', 0, 1),
(1, 'Egg allergy', 'Allergic to eggs and egg-derived ingredients', 'severe', 0, 1),
(1, 'Soy allergy', 'Allergic to soybeans and soy-based products', 'severe', 0, 1),
(1, 'Dairy allergy', 'Allergic to milk proteins (casein or whey)', 'severe', 0, 1),
(1, 'Wheat allergy', 'Allergic to wheat and wheat-derived ingredients', 'severe', 0, 1),
(1, 'Sesame allergy', 'Allergic to sesame seeds and sesame oil', 'severe', 0, 1),
(1, 'Legume allergy', 'Allergic to legumes (beans, lentils, chickpeas, peas)', 'severe', 0, 1);

-- Step 7: Insert Intolerance restrictions (Category 2)
INSERT INTO restrictions (category_id, restriction_name, description, severity_level, requires_admin_approval, is_active) VALUES
(2, 'Celiac disease', 'Autoimmune disorder requiring strict gluten-free diet', 'severe', 0, 1),
(2, 'Lactose intolerance', 'Difficulty digesting lactose (milk sugar)', 'moderate', 0, 1);
