-- =====================================================
-- DishCovery Dietary Restrictions Restructuring
-- Version: 002
-- Description: Clear and repopulate restrictions with proper categories
-- Date: 2025-01-06
-- =====================================================

-- Step 1: Clear existing data from junction table (recipes-tags mapping)
DELETE FROM recipe_dietary_tags;

-- Step 2: Clear existing dietary tags
DELETE FROM dietary_tags;

-- Step 3: Reset auto-increment
ALTER TABLE dietary_tags AUTO_INCREMENT = 1;

-- Step 4: Ensure restriction_categories has correct categories
-- First, clear and repopulate to ensure consistency
DELETE FROM restriction_categories;
ALTER TABLE restriction_categories AUTO_INCREMENT = 1;

INSERT INTO restriction_categories (category_name, description) VALUES
    ('Dietary Lifestyle', 'Dietary preferences and lifestyle choices'),
    ('Allergy', 'Food allergies that can cause adverse reactions'),
    ('Intolerance', 'Food intolerances and sensitivities');

-- Step 5: Insert Dietary Lifestyle restrictions
INSERT INTO dietary_tags (tag_name, tag_category, description) VALUES
    ('Dairy free', 'dietary', 'Does not contain milk, cheese, butter, or any dairy products'),
    ('Gluten free', 'dietary', 'Does not contain wheat, barley, rye, or gluten-containing grains'),
    ('Halal', 'dietary', 'Prepared according to Islamic dietary laws'),
    ('Vegan', 'dietary', 'Contains no animal products including meat, dairy, eggs, or honey'),
    ('Vegetarian', 'dietary', 'Contains no meat or fish, may include dairy and eggs');

-- Step 6: Insert Allergy restrictions
INSERT INTO dietary_tags (tag_name, tag_category, description) VALUES
    ('Nut allergy', 'allergy', 'Free from tree nuts (almonds, walnuts, cashews, etc.)'),
    ('Peanut allergy', 'allergy', 'Free from peanuts and peanut-derived ingredients'),
    ('Shellfish allergy', 'allergy', 'Free from shellfish (shrimp, crab, lobster, etc.)'),
    ('Fish allergy', 'allergy', 'Free from all types of fish'),
    ('Egg allergy', 'allergy', 'Free from eggs and egg-derived ingredients'),
    ('Soy allergy', 'allergy', 'Free from soybeans and soy-based products'),
    ('Dairy allergy', 'allergy', 'Free from milk and all dairy products (lactose or casein allergy)'),
    ('Wheat allergy', 'allergy', 'Free from wheat and wheat-derived ingredients'),
    ('Sesame allergy', 'allergy', 'Free from sesame seeds and sesame oil'),
    ('Legume allergy', 'allergy', 'Free from legumes (beans, lentils, chickpeas, etc.)');

-- Step 7: Insert Intolerance restrictions
INSERT INTO dietary_tags (tag_name, tag_category, description) VALUES
    ('Celiac-safe', 'intolerance', 'Safe for celiac disease - strictly gluten-free'),
    ('Lactose-free', 'intolerance', 'Free from lactose (milk sugar) for lactose intolerance');

-- Verification query (not executed by migration script)
-- SELECT
--     rc.category_name,
--     dt.tag_name,
--     dt.description
-- FROM dietary_tags dt
-- LEFT JOIN restriction_categories rc ON dt.tag_category =
--     CASE
--         WHEN dt.tag_category = 'dietary' THEN 'Dietary Lifestyle'
--         WHEN dt.tag_category = 'allergy' THEN 'Allergy'
--         WHEN dt.tag_category = 'intolerance' THEN 'Intolerance'
--     END
-- ORDER BY rc.category_name, dt.tag_name;
